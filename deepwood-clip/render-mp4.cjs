#!/usr/bin/env node
// Renders deepwood.html frame-by-frame (deterministic, 1920x1080 @ 24 fps) to deepwood.mp4.
// Needs: node, ffmpeg on PATH, and `npm i playwright && npx playwright install chromium`.
const { chromium } = require('playwright'), { spawn } = require('child_process'), path = require('path');
(async () => {
  const out = process.argv[2] || path.join(__dirname, 'deepwood.mp4');
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto('file://' + path.join(__dirname, 'deepwood.html') + '?export=1');
  await page.waitForFunction('window.READY===true', { timeout: 180000 });
  const { frames, FPS } = await page.evaluate('window.clipInfo');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-vf', 'tpad=stop_mode=clone:stop_duration=1.5', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < frames; i++) {
    const b64 = await page.evaluate(i => { renderFrame(i); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, i);
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 24 == 23) console.log('rendered', i + 1, '/', frames);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close(); console.log('wrote', out);
})();
