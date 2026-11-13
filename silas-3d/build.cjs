// Inlines three.js (MIT, vendor/) and src/*.js into one self-contained page: silas-turnaround.html
const fs = require('fs'), p = require('path'), rd = f => fs.readFileSync(p.join(__dirname, f), 'utf8');
const js = ['sdf', 'ref', 'model', 'toon', 'sheet'].map(f => rd('src/' + f + '.js')).join('\n');
fs.writeFileSync(p.join(__dirname, 'silas-turnaround.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Silas turnaround</title>
<style>body{margin:0;background:#8f8a83;color:#221f1b;font:15px/1.5 ui-monospace,monospace}h1{font-size:18px;margin:0;padding:14px 18px}
#sheet{display:block;width:100%;height:auto}#view{display:none;width:min(900px,100vw);height:auto;aspect-ratio:1;margin:18px auto;touch-action:none;cursor:grab;border:3px solid #221f1b}#status{text-align:center;padding:10px}</style></head>
<body><h1>SILAS &mdash; 3D model sheet (sculpted and shaded entirely in code)</h1><canvas id="sheet"></canvas><div id="status">loading…</div><canvas id="view"></canvas>
<script>${rd('vendor/three.min.js')}</script><script>${js}</script></body></html>`);
console.log('built silas-turnaround.html');
