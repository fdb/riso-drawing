// Launch headless Chrome with WebGPU, open a page, wait until document.title leaves "RUNNING", print title + page text.
// usage: node scripts/run-headless.mjs <url> [--shot out.png] [--size N] [extra chrome flags...]
// --shot saves a PNG of the page once the title changes; --size sets the window size (default 1080).
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const argv = process.argv.slice(2);
const shotAt = argv.indexOf('--shot'), shot = shotAt >= 0 ? argv.splice(shotAt, 2)[1] : null;
const sizeAt = argv.indexOf('--size'), size = sizeAt >= 0 ? +argv.splice(sizeAt, 2)[1] : 1080;
const url = argv[0], extra = argv.slice(1), PORT = 9333 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'chrome-gpu-'));
const chrome = spawn(CHROME, ['--headless=new', '--enable-unsafe-webgpu', '--allow-file-access-from-files', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, `--window-size=${size},${size}`, '--hide-scrollbars', ...extra, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let stderr = ''; chrome.stderr.on('data', d => { stderr += d; });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let target;
for (let i = 0; i < 100 && !target; i++) {
  try { const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); target = list.find(t => t.type === 'page'); } catch { await sleep(100); }
}
if (!target) { console.log('could not connect to Chrome'); console.log(stderr.slice(-2000)); chrome.kill(); process.exit(2); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method === 'Runtime.consoleAPICalled') console.log('console:', m.params.args.map(a => a.value ?? a.description).join(' ')); else if (m.method === 'Runtime.exceptionThrown') console.log('exception:', m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.result?.value;

await send('Runtime.enable');
// the viewport is exactly size×size regardless of browser chrome, so screenshots are the whole page
await send('Emulation.setDeviceMetricsOverride', { width: size, height: size, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });
const t0 = Date.now(); let title = 'RUNNING';
while (Date.now() - t0 < 90000) { await sleep(250); title = await evalJs('document.title'); if (title && title !== 'RUNNING') break; }
console.log('TITLE:', title, `(${((Date.now() - t0) / 1000).toFixed(1)}s)`);
if (shot) {
  const { writeFileSync } = await import('node:fs');
  const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: size, height: size, scale: 1 } });
  writeFileSync(shot, Buffer.from(r.result.data, 'base64'));
  console.log('SHOT:', shot);
} else console.log(await evalJs('document.body.innerText'));
ws.close(); chrome.kill();
