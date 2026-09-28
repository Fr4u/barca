#!/usr/bin/env node
/*
 * Render edita do MP4 (1080×1920, 60 kl./s, H.264 + AAC) albo pojedynczych klatek.
 *
 *   node edit/render.mjs video  [--ffmpeg /ścieżka/ffmpeg] [--workers 3]
 *   node edit/render.mjs stills 0.5 4.2 7.4 ...        (PNG do edit/out/stills)
 *
 * Wymaga: Playwright z Chromium oraz ffmpeg z libx264 (np. pip install imageio-ffmpeg).
 * Ścieżka dźwiękowa: edit/build/soundtrack.wav (python edit/audio/make_audio.py …).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const mode = args[0] || 'video';
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const FFMPEG = opt('ffmpeg', process.env.FFMPEG || 'ffmpeg');
const WORKERS = Number(opt('workers', 3));
const TL = JSON.parse(fs.readFileSync(path.join(ROOT, 'edit/timeline.json'), 'utf8'));

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.css': 'text/css; charset=utf-8', '.m4a': 'audio/mp4', '.wav': 'audio/wav' };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const p = path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

async function openPage(browser, port) {
  const ctx = await browser.newContext({ viewport: { width: TL.width, height: TL.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { console.error('BŁĄD STRONY:', e.message); process.exitCode = 1; });
  await page.goto(`http://127.0.0.1:${port}/edit/edit.html`);
  await page.waitForFunction(() => window.EDIT_READY === true, null, { timeout: 30000 });
  return page;
}
async function frame(page, t) {
  await page.evaluate((tt) => window.renderFrame(tt), t);
  return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: TL.width, height: TL.height } });
}

const srv = await serve();
const port = srv.address().port;
const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });

if (mode === 'stills') {
  const out = path.join(ROOT, 'edit/out/stills');
  fs.mkdirSync(out, { recursive: true });
  const page = await openPage(browser, port);
  if (args.includes('--guides')) await page.evaluate(() => { window.SHOW_GUIDES = true; });
  for (const a of args.slice(1).filter((x) => /^[\d.]+$/.test(x))) {
    const png = await frame(page, Number(a));
    fs.writeFileSync(path.join(out, `t${Number(a).toFixed(3)}.png`), png);
  }
  console.log('stills ->', out);
} else {
  const fps = TL.fps;
  const total = Math.round(TL.duration * fps);
  const audio = path.join(ROOT, 'edit/build/soundtrack.wav');
  const outDir = path.join(ROOT, 'edit/out');
  fs.mkdirSync(outDir, { recursive: true });
  const video = path.join(outDir, opt('out', 'barca-two-left-feet-tiktok.mp4'));
  const ff = spawn(FFMPEG, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-i', audio,
    '-map', '0:v', '-map', '1:a',
    '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-profile:v', 'high', '-level:v', '4.2',
    '-x264-params', 'keyint=60:min-keyint=60:scenecut=0',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-r', String(fps), '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
    '-t', String(TL.duration), '-movflags', '+faststart', video,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const pages = await Promise.all(Array.from({ length: WORKERS }, () => openPage(browser, port)));
  const t0 = Date.now();
  const pending = new Map();
  let next = 0;
  // każda karta renderuje swoje klatki ściśle po kolei (render + zrzut jako jedna operacja),
  // inaczej zrzut klatki N mógłby złapać zawartość klatki N + WORKERS
  const chains = pages.map(() => Promise.resolve());
  const launch = (i) => {
    if (i >= total) return;
    const w = i % WORKERS;
    const job = chains[w].then(() => frame(pages[w], (i + 0.5) / fps));
    chains[w] = job.catch(() => {});
    pending.set(i, job);
  };
  for (let w = 0; w < WORKERS * 2; w++) launch(next++);
  for (let i = 0; i < total; i++) {
    const png = await pending.get(i);
    pending.delete(i);
    launch(next++);
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 60 === 0) process.stdout.write(`\rklatka ${i}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(`\ngotowe: ${video}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
await browser.close();
srv.close();
