/* ============ PLAYER ============
   default : inks all 288 frames once (progress bar), then plays them back at a rock-steady 24 fps
   ?live   : draws procedurally in real time instead (no warm-up; smoothness depends on your machine)
   ?export : idle; frames are pulled by render-mp4.cjs through window.renderFrame(i)               */
const cv = document.getElementById('c'), OUT = cv.getContext('2d'), HUD = document.getElementById('h');
const NF = FPS * DUR, Q = new URLSearchParams(location.search);
function render(t) {
  t = clamp(t, 0, DUR - 1e-4);
  const tc = Math.floor(t * 12 + 1e-6) / 12, fx = { mis: 2, still: false };   // characters animate on twos (12 poses/s)
  g = SB.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.fillStyle = INK; g.fillRect(0, 0, W, H); JIT = 0;
  if (t < 3) shot1(t, tc, fx); else if (t < 6) shot2(t, tc, fx); else if (t < 9) shot3(t, tc, fx); else shot4(t, tc, fx);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  present(OUT, fx.mis, fx.still ? 4242 : Math.floor(t * 12));
}
window.renderFrame = i => render((i + .5) / FPS);
window.clipInfo = { W, H, FPS, DUR, frames: NF };
let playing = true, T = 0, last = 0;
const HELP = 'click / space: pause &middot; R: restart &middot; &larr; &rarr;: step frame &middot; F: fullscreen';
function controls() {
  const step = d => { playing = false; T = clamp((Math.floor(T * FPS + 1e-6) + d) / FPS, 0, DUR - 1 / FPS); };
  addEventListener('keydown', e => {
    if (e.code == 'Space') { playing = !playing; e.preventDefault(); }
    else if (e.key == 'r' || e.key == 'R') { T = 0; playing = true; }
    else if (e.key == 'ArrowRight') step(1); else if (e.key == 'ArrowLeft') step(-1);
    else if (e.key == 'f' || e.key == 'F') (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
  });
  cv.addEventListener('click', () => { playing = !playing; });
  HUD.innerHTML = HELP; setTimeout(() => HUD.style.opacity = 0, 5000);
}
const tick = now => { if (playing) { T += Math.min(.1, (now - last) / 1000); if (T >= DUR + 1.5) T = 0; } last = now; };   // hold the last panel, then loop
async function init() {
  g = OUT; OUT.fillStyle = '#000'; OUT.fillRect(0, 0, W, H);
  HUD.textContent = 'preparing the Deepwood…'; await new Promise(r => setTimeout(r, 30));
  buildPost(); buildScenes(); window.READY = true;
  if (Q.has('export')) { render(0); return; }
  if (Q.has('live')) {
    controls(); const loop = now => { tick(now); render(Math.min(T, DUR - 1e-3)); requestAnimationFrame(loop); };
    requestAnimationFrame(now => { last = now; loop(now); }); return;
  }
  const blobs = [];
  for (let i = 0; i < NF; i++) {
    renderFrame(i); blobs.push(await new Promise(r => cv.toBlob(r, 'image/jpeg', .94)));
    HUD.textContent = 'inking frame ' + (i + 1) + ' / ' + NF + '  (add ?live to the URL to skip this and draw in real time)';
  }
  const bmp = new Map(); let shown = -1;
  const want = i => { if (!bmp.has(i)) { const e = { b: null }; bmp.set(i, e); createImageBitmap(blobs[i]).then(b => { e.b = b; }); } return bmp.get(i); };
  controls();
  const loop = now => {
    tick(now); const i = Math.min(NF - 1, Math.floor(T * FPS + 1e-6));
    for (let k = 0; k < 8; k++) want((i + k) % NF);
    const e = want(i); if (e.b && i != shown) { OUT.drawImage(e.b, 0, 0); shown = i; }
    for (const [k, v] of bmp) if ((k < i - 2 || k > i + 12) && !(i + 8 >= NF && k < 8)) { if (v.b) v.b.close(); bmp.delete(k); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(now => { last = now; loop(now); });
}
setTimeout(init, 30);
