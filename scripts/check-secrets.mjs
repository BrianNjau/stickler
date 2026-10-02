#!/usr/bin/env node
// Fails (exit 1) if server-only secrets could reach the client.
//
//   node scripts/check-secrets.mjs            scan tracked + untracked-but-not-ignored files
//   node scripts/check-secrets.mjs dist       also scan a built bundle directory
//
// Two rules:
//  1. Client code (app/, src/, shared/, root config) must not even *name* a server secret.
//     Edge Functions legitimately read them from Deno.env, so supabase/functions is exempt.
//  2. No file anywhere may contain key material: Anthropic keys, Google API keys, Supabase
//     secret keys, or a JWT whose payload says role=service_role.
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const CLIENT_PATHS = /^(app|src|shared)\/|^(app\.json|eas\.json|package\.json|metro\.config\.js|babel\.config\.js)$/;
const SERVER_SECRET_NAMES = /SERVICE_ROLE|ANTHROPIC_API_KEY|GOOGLE_MAPS_API_KEY/i;
const KEY_MATERIAL = [
  ['Anthropic API key', /sk-ant-[A-Za-z0-9_-]{16,}/],
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/],
  ['Supabase secret key', /sb_secret_[A-Za-z0-9_-]{16,}/],
];
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g;
const TEXT_EXT = /\.(m?[jt]sx?|json|sql|toml|ya?ml|md|html|css|env|txt|map)$|(^|\/)\.env/;

const repoFiles = () =>
  execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function isServiceRoleJwt(payloadB64) {
  try {
    const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
    return JSON.parse(json).role === 'service_role';
  } catch {
    return false;
  }
}

const findings = [];

function scan(file, { client }) {
  const rel = relative(process.cwd(), file).split(sep).join('/');
  if (!TEXT_EXT.test(rel)) return;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return; // deleted in the working tree
  }
  if (rel === 'scripts/check-secrets.mjs') return;

  text.split('\n').forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    if (client && SERVER_SECRET_NAMES.test(line)) findings.push(`${at}  server secret referenced in client code`);
    for (const [label, re] of KEY_MATERIAL) if (re.test(line)) findings.push(`${at}  ${label}`);
    for (const m of line.matchAll(JWT)) if (isServiceRoleJwt(m[1])) findings.push(`${at}  service_role JWT`);
  });
}

for (const f of repoFiles()) scan(f, { client: CLIENT_PATHS.test(f) });
for (const dir of process.argv.slice(2)) for (const f of walk(dir)) scan(f, { client: true });

if (findings.length) {
  console.error(`check-secrets: ${findings.length} problem(s)\n  ${findings.join('\n  ')}`);
  console.error('Server secrets belong in Edge Function secrets only (supabase secrets set ...).');
  process.exit(1);
}
console.log('check-secrets: clean');
