#!/usr/bin/env node
// One-command harness: build page -> render model part-ID maps in the three reference views -> score against the labelled reference.
// usage: node tools/check.cjs [tag]     (writes reports/<tag>/)
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const root = path.join(__dirname, '..'), tag = process.argv[2] || 'latest', out = path.join(root, 'reports', tag);
(async () => {
  execSync('node build.cjs', { cwd: root }); fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(path.join(root, 'build'), { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }), p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  p.on('pageerror', e => console.log('PAGE ERROR', e.message)); p.on('console', m => { if (m.type() == 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
  const t0 = Date.now(); await p.goto('file://' + path.join(root, 'silas-turnaround.html') + '?harness=1'); await p.waitForFunction('window.READY===true', null, { timeout: 600000 });
  console.log('build time', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  for (const v of ['front', 'side', 'back']) { const d = await p.evaluate(v => idShot(v), v); fs.writeFileSync(path.join(root, 'build', 'model_' + v + '_id.png'), Buffer.from(d.split(',')[1], 'base64')); }
  if (process.argv[3] == 'final') { const cov = []; for (let i = 0; i < 12; i++) cov.push(await p.evaluate(a => inkCoverage(a), i * Math.PI / 6)); const ms = await p.evaluate('frameMs()'); const txt = 'ink coverage of part boundaries, 12 turnaround cameras: min ' + (Math.min(...cov) * 100).toFixed(1) + '%  mean ' + (cov.reduce((a, b) => a + b) / 12 * 100).toFixed(1) + '%\nframe time 900x900 (software GL in this container, not a real GPU): ' + ms.toFixed(0) + ' ms'; console.log(txt); fs.writeFileSync(path.join(out, 'gate4.txt'), txt + '\n'); }
  if (process.argv[3] == 'shots' || process.argv[3] == 'final') for (const [n, js] of Object.entries(JSON.parse(fs.readFileSync(path.join(__dirname, 'shots.json'), 'utf8')))) { const d = await p.evaluate(js); fs.writeFileSync(path.join(out, n + '.png'), Buffer.from(d.split(',')[1], 'base64')); }
  await b.close();
  console.log(execSync('python3 tools/score.py ' + out, { cwd: root, env: { ...process.env, PYTHONPATH: 'tools' } }).toString());
})();
