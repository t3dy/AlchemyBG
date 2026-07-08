/* Build: inline sim + render + shell into a self-contained HTML per variant.
 * Run: `node build.mjs`  →  writes dist/{tick,realtime,pausable}.html + index.html
 * Self-contained so each file opens with a double-click and is publishable as an
 * Artifact (no external requests, which a strict CSP would block).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(here, p), 'utf8');
const sim = read('src/sim.js'), render = read('src/render.js'), shell = read('src/shell.js');

const CSS = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #17121a; color: #e8dfe8;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
  .puffers-wrap { max-width: 960px; margin: 0 auto; padding: 12px; }
  .puffers-canvas { width: 100%; display: block; border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,.5); touch-action: none; cursor: pointer; }
  .puffers-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
    margin-bottom: 10px; }
  .puffers-title { font-weight: 800; letter-spacing: .12em; text-transform: uppercase;
    color: #d8b24a; margin-right: 6px; }
  .puffers-btn { background: #2a2130; color: #e8dfe8; border: 1px solid #43384a;
    border-radius: 8px; padding: 6px 12px; font-size: 14px; cursor: pointer; }
  .puffers-btn:hover { background: #372b40; border-color: #6a5878; }
  .puffers-hint { margin-top: 10px; font-size: 13px; line-height: 1.5; color: #a99ba9; }
  .puffers-menu { max-width: 640px; margin: 8vh auto; padding: 24px; text-align: center; }
  .puffers-menu h1 { color: #d8b24a; letter-spacing: .08em; }
  .puffers-menu a { display: block; margin: 14px auto; max-width: 420px; text-decoration: none;
    background: #2a2130; border: 1px solid #43384a; border-radius: 12px; padding: 16px 20px;
    color: #e8dfe8; text-align: left; }
  .puffers-menu a:hover { background: #372b40; border-color: #6a5878; }
  .puffers-menu b { color: #f0e6f0; } .puffers-menu span { color: #a99ba9; font-size: 13px; }
`;

const page = (mode, title) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title><style>${CSS}</style></head>
<body><div id="app"></div>
<script>${sim}</script>
<script>${render}</script>
<script>${shell}</script>
<script>Puffers.boot(${JSON.stringify(mode)});</script>
</body></html>`;

const menu = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Puffers — pick a variant</title><style>${CSS}</style></head>
<body><div class="puffers-menu">
<h1>PUFFERS</h1>
<p style="color:#a99ba9">Too few gnomes, too many bellows. Three genre prototypes of the
same lab — same rules, different sense of time.</p>
<a href="pausable.html"><b>⏸ Pausable</b> — real-time you can freeze to reassign. The recommended default.<br><span>Space to pause/resume.</span></a>
<a href="realtime.html"><b>⏱ Real-time</b> — Overcooked-style scramble, no pausing.<br><span>Pure dexterity.</span></a>
<a href="tick.html"><b>▶ Tick</b> — Zachtronics-style: plan, Step ½s, watch, repeat.<br><span>Or hit Run to watch it play out.</span></a>
</div></body></html>`;

mkdirSync(join(here, 'dist'), { recursive: true });
const variants = [
  ['tick', 'Puffers — Tick'],
  ['realtime', 'Puffers — Real-time'],
  ['pausable', 'Puffers — Pausable'],
];
for (const [mode, title] of variants) {
  writeFileSync(join(here, 'dist', `${mode}.html`), page(mode, title));
  console.log('wrote dist/' + mode + '.html');
}
writeFileSync(join(here, 'dist', 'index.html'), menu);
console.log('wrote dist/index.html');
