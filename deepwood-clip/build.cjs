// Inlines src/*.js into one self-contained HTML file: deepwood.html
const fs=require('fs'),p=require('path');
const order=['core','env','silas','creature','shots','main'];
const js=order.map(f=>fs.readFileSync(p.join(__dirname,'src',f+'.js'),'utf8')).join('\n');
const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Deepwood</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}
#c{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(100vw,177.78vh);height:min(56.25vw,100vh);cursor:pointer}
#h{position:absolute;left:0;right:0;bottom:10px;text-align:center;font:13px/1.4 monospace;color:#9ab;opacity:.9;pointer-events:none;transition:opacity 1s;text-shadow:0 0 4px #000}</style></head>
<body><canvas id="c" width="1920" height="1080"></canvas><div id="h"></div>
<script>
${js}
</script></body></html>`;
fs.writeFileSync(p.join(__dirname,'deepwood.html'),html);
console.log('built deepwood.html',(html.length/1024|0)+'kB');
