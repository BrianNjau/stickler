// supabase/functions/commute-check/index.ts
// Travel time for a day's legs, with a shared cache so the same route is only ever paid for once
// per 15-minute departure bucket. Then it recomputes feasibility for that day.
//
// secrets: GOOGLE_MAPS_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
//
// Cost control (Directions is billed per request):
//   * cache key = origin cell (3dp ≈ 110 m) + dest cell + mode + 15-min bucket, TTL 24 h
//   * hard cap of MAX_CALLS_PER_USER_PER_DAY live calls per user
//   * the client calls this at most once per block per day, and on explicit "re-check" taps

import { createClient } from 'jsr:@supabase/supabase-js@2';

const MAX_CALLS_PER_USER_PER_DAY = 20;
const CACHE_TTL_MS = 24 * 3600 * 1000;

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);

  const { local_date } = await req.json();

  const { data: day } = await asUser.from('day_plans').select('id, local_date, timezone')
    .eq('local_date', local_date).single();
  if (!day) return json({ error: 'no day plan' }, 404);

  const { data: legs } = await asUser.from('commute_legs')
    .select('*, from_place:places!commute_legs_from_place_id_fkey(*), to_place:places!commute_legs_to_place_id_fkey(*)')
    .eq('day_plan_id', day.id);

  let liveCalls = 0;
  for (const leg of legs ?? []) {
    if (!leg.from_place || !leg.to_place) continue;
    const bucket = bucketFor(day.local_date, leg.depart_local, day.timezone);
    const key = {
      origin_cell: cell(leg.from_place.lat, leg.from_place.lng),
      dest_cell:   cell(leg.to_place.lat, leg.to_place.lng),
      mode: leg.mode, depart_bucket: bucket.toISOString(),
    };

    const { data: hit } = await admin.from('travel_cache').select('*')
      .match(key).gte('fetched_at', new Date(Date.now() - CACHE_TTL_MS).toISOString()).maybeSingle();

    let seconds = hit?.duration_traffic_s ?? hit?.duration_s ?? null;

    if (seconds == null) {
      if (liveCalls >= MAX_CALLS_PER_USER_PER_DAY) continue;
      liveCalls++;
      const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
      url.searchParams.set('origin', `${leg.from_place.lat},${leg.from_place.lng}`);
      url.searchParams.set('destination', `${leg.to_place.lat},${leg.to_place.lng}`);
      url.searchParams.set('mode', leg.mode);
      if (leg.mode === 'driving') {
        url.searchParams.set('departure_time', String(Math.floor(bucket.getTime() / 1000)));
        url.searchParams.set('traffic_model', 'pessimistic'); // plans fail on optimism, not traffic
      }
      url.searchParams.set('key', Deno.env.get('GOOGLE_MAPS_API_KEY')!);

      const r = await fetch(url).then((x) => x.json());
      const leg0 = r?.routes?.[0]?.legs?.[0];
      if (!leg0) continue;
      seconds = leg0.duration_in_traffic?.value ?? leg0.duration?.value;

      await admin.from('travel_cache').upsert({
        ...key, duration_s: leg0.duration?.value, duration_traffic_s: leg0.duration_in_traffic?.value ?? null,
        fetched_at: new Date().toISOString(),
      }, { onConflict: 'origin_cell,dest_cell,mode,depart_bucket' });
    }

    await admin.from('commute_legs').update({ duration_s: seconds }).eq('id', leg.id);
  }

  const { data: feasibility } = await asUser.rpc('fn_feasibility', { p_date: local_date });
  const { data: cuts } = feasibility?.verdict === 'not_possible'
    ? await asUser.rpc('fn_suggest_cuts', { p_date: local_date })
    : { data: [] };

  await admin.from('events').insert({ user_id: user.id, name: 'commute_checked',
    props: { local_date, live_calls: liveCalls, verdict: feasibility?.verdict } });

  return json({ feasibility, cuts, live_calls: liveCalls });
});

const cell = (lat: number, lng: number) => `${(+lat).toFixed(3)},${(+lng).toFixed(3)}`;

function bucketFor(date: string, time: string, tz: string) {
  // build the local departure instant, then round down to 15 minutes
  const d = new Date(`${date}T${time}`);
  const offsetMin = tzOffsetMinutes(d, tz);
  const utc = new Date(d.getTime() - offsetMin * 60000);
  utc.setUTCMinutes(Math.floor(utc.getUTCMinutes() / 15) * 15, 0, 0);
  return utc;
}
function tzOffsetMinutes(at: Date, tz: string) {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = Object.fromEntries(dtf.formatToParts(at).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return (asUTC - at.getTime()) / 60000;
}
function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });
}
