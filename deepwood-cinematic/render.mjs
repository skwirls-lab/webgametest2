#!/usr/bin/env node
/*
 * Renders deepwood.html to an MP4 (1920x1080, 24 fps, 12 s) with headless Chromium + ffmpeg.
 *
 *   node render.mjs                       -> deepwood.mp4
 *   node render.mjs --out my.mp4
 *   node render.mjs --frames 0,40,100 --png outdir    (stills for inspection)
 *
 * Requires: Node 18+, the `playwright` package (with Chromium) and ffmpeg on PATH.
 */
import { createRequire } from 'module';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = path.resolve(opt('--out', path.join(here, 'deepwood.mp4')));
const pngDir = opt('--png', null);
const framesArg = opt('--frames', null);
const crf = opt('--crf', '16');

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
page.on('pageerror', e => { console.log('[pageerror]', e.message); process.exit(1); });
await page.goto('file://' + path.join(here, 'deepwood.html') + '?render=1');
await page.waitForFunction(() => window.DEEPWOOD_READY === true, null, { timeout: 180000 });
const NF = await page.evaluate(() => window.DEEPWOOD_NF);
const frames = framesArg ? framesArg.split(',').flatMap(s => { if (s.includes('-')) { const [a, b] = s.split('-').map(Number); return Array.from({ length: b - a + 1 }, (_, i) => a + i); } return [Number(s)]; }) : Array.from({ length: NF }, (_, i) => i);

const grab = async f => {
  const b64 = await page.evaluate(f => { window.renderFrame(f); return document.getElementById('out').toDataURL('image/png').split(',')[1]; }, f);
  return Buffer.from(b64, 'base64');
};
const t0 = Date.now();
if (pngDir) {
  fs.mkdirSync(pngDir, { recursive: true });
  for (const f of frames) { fs.writeFileSync(path.join(pngDir, `f${String(f).padStart(3, '0')}.png`), await grab(f)); }
  console.log(`wrote ${frames.length} png(s) to ${pngDir} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
} else {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '24', '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-tune', 'animation', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (const f of frames) {
    const buf = await grab(f);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 24 === 0) process.stdout.write(`\rframe ${f}/${NF}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log(`\nwrote ${out} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
await browser.close();
