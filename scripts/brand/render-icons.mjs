// Renders the Stickler icon set from the geometry of assets/brand/stickler-mark.svg, following the
// export list on docs/design/Logo and app icon@1x.png. Re-run after changing the mark:
//
//   npm i -g playwright-core          (once; drives your installed Edge, downloads no browser)
//   node scripts/brand/render-icons.mjs
//
// playwright-core is deliberately not a project dependency: this runs a few times a year.
import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = mkdtempSync(join(tmpdir(), 'stickler-icons-'));
// PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core overrides the global install.
const pwPath = process.env.PLAYWRIGHT_CORE ?? join(execSync('npm root -g').toString().trim(), 'playwright-core');
const { chromium } = createRequire(import.meta.url)(pwPath);
const FONT = pathToFileURL(
  `${REPO}/node_modules/@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf`,
).href;

const C = { amber: '#E0902A', red: '#C23A2B', paper: '#FBFAF7', ink: '#16202A', white: '#FFFFFF' };

// Logo sheet: ring stroke 9 at >=56px, 11 at 40, 14 at 28, 18 at 20 (viewBox units).
const strokeFor = (px) => (px >= 56 ? 9 : px >= 40 ? 11 : px >= 28 ? 14 : 18);
const TICK = 'M52 67.5l10.5 10L82 55.5';

function mark(px, way = 'primary') {
  const sw = strokeFor(px);
  const small = px < 20;
  if (way === 'silhouette') {
    // One colour, tick knocked out: for Android monochrome + notification icons (system tints them).
    return `<svg viewBox="0 0 132 132" width="${px}" height="${px}"><defs><mask id="m"><rect width="132" height="132" fill="#fff"/>
      <path d="${TICK}" stroke="#000" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/></mask></defs>
      <g mask="url(#m)"><circle cx="66" cy="66" r="58" fill="none" stroke="${C.white}" stroke-width="${sw}"/>
      <circle cx="66" cy="66" r="31" fill="${C.white}"/></g></svg>`;
  }
  const ring = way === 'primary' && !small ? C.amber : C.ink;
  return `<svg viewBox="0 0 132 132" width="${px}" height="${px}">
    <circle cx="66" cy="66" r="58" fill="${C.paper}"/>
    <circle cx="66" cy="66" r="58" fill="none" stroke="${ring}" stroke-width="${sw}"/>
    <circle cx="66" cy="66" r="31" fill="${way === 'primary' ? C.red : C.ink}"/>
    <path d="${TICK}" stroke="${C.paper}" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    ${small ? '' : `<circle cx="86" cy="44" r="7.5" fill="${C.paper}" opacity="0.92"/>`}</svg>`;
}

// Wordmark: Bricolage Grotesque 800, tracking -3%, the mark's pupil+tick as the dot of the i.
function wordmark(fontPx, color) {
  const dot = Math.round(fontPx * 0.36);
  return `<div class="wm" style="font-size:${fontPx}px;color:${color}">St<span class="i">ı<span class="dot" style="width:${dot}px;height:${dot}px;top:${fontPx * 0.03}px">
    <svg viewBox="35 35 62 62" width="${dot}" height="${dot}"><circle cx="66" cy="66" r="31" fill="${C.red}"/>
    <path d="${TICK}" stroke="${C.paper}" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span></span>ckler</div>`;
}

const page = (w, h, bg, body) => `<!doctype html><html><head><style>
  @font-face{font-family:B;src:url('${FONT}')}
  html,body{margin:0;width:${w}px;height:${h}px;background:${bg};overflow:hidden}
  .c{width:${w}px;height:${h}px;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .wm{font-family:B;font-weight:800;letter-spacing:-0.03em;line-height:1;white-space:nowrap}
  .i{position:relative;display:inline-block}
  .dot{position:absolute;left:50%;transform:translateX(-50%)}
  .dot svg{display:block}
</style></head><body><div class="c">${body}</div></body></html>`;

const jobs = [
  // Stores round the corners themselves: square, opaque, ink field.
  ['icon.png', 1024, 1024, C.ink, mark(640)],
  // Adaptive foreground: 432 canvas, mark inside the 288px safe zone; background colour set in app.json.
  ['android-icon-foreground.png', 432, 432, 'transparent', mark(264)],
  ['android-icon-monochrome.png', 432, 432, 'transparent', mark(264, 'silhouette')],
  // Splash: mark over the paper wordmark, transparent, shown on ink at imageWidth 200.
  ['splash-icon.png', 512, 512, 'transparent', `${mark(302)}<div style="height:44px"></div>${wordmark(118, C.paper)}`],
  ['favicon.png', 48, 48, 'transparent', mark(46)],
  // Android tints this; white on transparent only. Wired up when expo-notifications lands.
  ['brand/notification-icon.png', 96, 96, 'transparent', mark(88, 'silhouette')],
];

const browser = await chromium.launch({ channel: 'msedge', headless: true });
for (const [name, w, h, bg, body] of jobs) {
  const html = join(OUT, name.replace('/', '_') + '.html');
  writeFileSync(html, page(w, h, bg, body));
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.goto(pathToFileURL(html).href);
  await p.evaluate(() => document.fonts.ready);
  const png = join(OUT, name.replace('/', '_'));
  await p.screenshot({ path: png, omitBackground: bg === 'transparent' });
  await p.close();
  mkdirSync(dirname(join(REPO, 'assets', name)), { recursive: true });
  renameSync(png, join(REPO, 'assets', name));
  console.log('assets/' + name, `${w}x${h}`);
}
await browser.close();
