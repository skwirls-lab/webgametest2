/* ===== Turnaround page ===== */
const $ = id => document.getElementById(id);
/* rasterise the traced reference polygons into a texture */
function refTexture(name, sc) {
  const R = REF[name], c = document.createElement('canvas'); c.width = R.w * sc; c.height = R.h * sc; const x = c.getContext('2d'); x.scale(sc, sc); x.lineJoin = 'round';
  for (const [k, p] of R.polys) { x.fillStyle = x.strokeStyle = R.pal[k]; x.beginPath(); x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]); x.closePath(); x.fill(); x.lineWidth = .5; x.stroke(); }
  // bleed colour outwards past the silhouette so edge samples never fall on empty paper
  const b = document.createElement('canvas'); b.width = c.width; b.height = c.height; const y = b.getContext('2d');
  for (const r of [18, 10, 5]) for (let a = 0; a < 8; a++) y.drawImage(c, Math.cos(a * Math.PI / 4) * r, Math.sin(a * Math.PI / 4) * r);
  y.drawImage(c, 0, 0);
  const t = new THREE.CanvasTexture(b); t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8; t.generateMipmaps = true; return t;
}
function setupRef() {
  for (const [n, u, m] of [['front', 'tF', 'mF'], ['side', 'tS', 'mS'], ['back', 'tB', 'mB']]) {
    const R = REF[n], V = VIEWMAP[n]; LOOK[u].value = refTexture(n, 2); LOOK[m].value.set(V.cx / R.w, V.gy / R.h, V.s / R.w, V.s / R.h);
  }
}
async function buildSilas(onProgress) {
  setupRef();
  const root = new THREE.Group();
  for (const [i, p] of PARTS.entries()) {
    onProgress && onProgress('sculpting ' + p.name + ' (' + (i + 1) + '/' + PARTS.length + ')'); await new Promise(r => setTimeout(r, 0));
    const geo = sculpt(p), m = new THREE.Mesh(geo, toonMat(p.gloss, p.frost, p.views, p.inset)), o = new THREE.Mesh(geo, hullMat(p.thin ? .6 : 1)); m.name = p.name; root.add(o, m);
  }
  return root;
}
const VIEWS = [['FRONT', 0, 1.0], ['THREE-QUARTER', .7, 1.25], ['SIDE', Math.PI / 2, 1.45], ['BACK', Math.PI, 1.0]], PXU = 470, Y0 = -.1, Y1 = 2.12;
THREE.ColorManagement.enabled = false;
async function main() {
  const st = $('status'), silas = await buildSilas(t => st.textContent = t);
  const scene = new THREE.Scene(); scene.add(silas);
  const view = $('view'), R = new THREE.WebGLRenderer({ canvas: view, antialias: true, preserveDrawingBuffer: true, alpha: true }); R.outputColorSpace = THREE.LinearSRGBColorSpace; R.setClearColor(0xa7a199, 1);
  window.ortho = (yaw, pxu, x0, x1, y0, y1) => { // fitting aid: transparent orthographic render at reference scale
    const w = Math.round((x1 - x0) * pxu), h = Math.round((y1 - y0) * pxu); R.setScissorTest(false); R.setPixelRatio(1); R.setSize(w, h, false); R.setViewport(0, 0, w, h); LOOK.uRes.value.set(w, h);
    const cam = new THREE.OrthographicCamera(x0, x1, y1, y0, .1, 20); cam.position.set(0, 0, 8); silas.rotation.y = yaw; R.setClearColor(0, 0); R.render(scene, cam); R.setClearColor(0xa7a199, 1); return view.toDataURL('image/png');
  };
  if (new URLSearchParams(location.search).has('fit')) { window.READY = true; return; }
  // --- sheet: four orthographic views
  const tw = VIEWS.reduce((a, v) => a + v[2], 0), SW = Math.round(tw * PXU), SHh = Math.round((Y1 - Y0) * PXU); R.setPixelRatio(1); R.setSize(SW, SHh, false); R.setScissorTest(true);
  LOOK.uRes.value.set(SW, SHh);
  let x = 0;
  for (const [name, yaw, w] of VIEWS) {
    const pw = Math.round(w * PXU); R.setViewport(x, 0, pw, SHh); R.setScissor(x, 0, pw, SHh); LOOK.uRes.value.set(pw, SHh);
    const cam = new THREE.OrthographicCamera(-w / 2, w / 2, Y1, Y0, .1, 20); const off = name == 'SIDE' ? -.3 : name == 'THREE-QUARTER' ? -.16 : 0;
    cam.position.set(off, 0, 8); silas.rotation.y = yaw; R.render(scene, cam); x += pw;
  }
  const sheet = $('sheet'); sheet.width = SW; sheet.height = SHh; const c2 = sheet.getContext('2d'); c2.drawImage(view, 0, 0);
  c2.strokeStyle = 'rgba(40,36,30,.25)'; c2.lineWidth = 1.5; for (const gy of GUIDES) { const py = (Y1 - gy) / (Y1 - Y0) * SHh; c2.beginPath(); c2.moveTo(0, py); c2.lineTo(SW, py); c2.stroke(); }
  x = 0; c2.fillStyle = '#2a2622'; c2.font = '600 20px ui-monospace,monospace'; for (const [name, , w] of VIEWS) { c2.fillText(name, x + 16, 30); x += w * PXU; }
  // --- interactive viewer
  R.setScissorTest(false); const VS = 900; R.setPixelRatio(Math.min(2, devicePixelRatio)); R.setSize(VS, VS, false); R.setViewport(0, 0, VS, VS); view.style.display = 'block';
  const cam = new THREE.PerspectiveCamera(28, 1, .1, 30); let yaw = .6, pitch = .08, auto = true, drag = null;
  view.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY, yaw, pitch]; auto = false; view.setPointerCapture(e.pointerId); });
  view.addEventListener('pointermove', e => { if (drag) { yaw = drag[2] + (e.clientX - drag[0]) * .01; pitch = Math.max(-.5, Math.min(.9, drag[3] + (e.clientY - drag[1]) * .006)); } });
  view.addEventListener('pointerup', () => drag = null);
  window.frame = (yw, pt) => {
    const b = R.getDrawingBufferSize(new THREE.Vector2()); LOOK.uRes.value.copy(b); silas.rotation.y = yw;
    cam.position.set(0, 1.0 + Math.sin(pt) * 4.5, Math.cos(pt) * 4.5); cam.lookAt(0, 1.0, -.2); R.render(scene, cam);
  };
  st.textContent = 'drag to rotate'; window.READY = true;
  const loop = t => { if (auto) yaw = .6 + t * .0005; frame(yaw, pitch); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
}
main();
