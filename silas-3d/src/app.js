/* ===== Page: builds Silas, exposes harness hooks, draws the model sheet and the viewer ===== */
THREE.ColorManagement.enabled = false;
const $ = id => document.getElementById(id), QS = new URLSearchParams(location.search);
const INKVIEWS = { tail: [0, 1, 0], cloak: [1, 1, 1], trousers: [1, 1, 1], shins: [1, 1, 1], feet: [1, 1, 1], tunic: [1, 1, 0], belt: [1, 0, 0], hands: [1, 0, 1], sleeves: [1, 0, 1], bracers: [1, 0, 1], cape: [1, 1, 1], head: [1, 1, 1], ears: [1, 1, 1] };
async function buildSilas(onProgress) {
  buildInkTextures(); const root = new THREE.Group(), rig = buildSkeleton(); root.add(rig.root);
  const add = (geo, mat, fn) => { skinGeometry(geo, fn, rig.index); const m = new THREE.SkinnedMesh(geo, mat); m.frustumCulled = false; m.bind(rig.skeleton, new THREE.Matrix4()); root.add(m); return m; };
  for (const [i, p] of PARTS.entries()) {
    onProgress && onProgress('sculpting ' + p.name + ' (' + (i + 1) + '/' + PARTS.length + ')'); await new Promise(r => setTimeout(r, 0));
    const m = add(sculpt(p), colorMat(p.c, p.gloss, p.ink === undefined ? INKVIEWS[p.name] : p.ink, REFD.parts.indexOf(p.name), p.mkLine), SKIN[p.name]);
    m.name = p.name; m.userData.pid = REFD.parts.indexOf(p.pid || p.name); m.userData.gid = p.gid || m.userData.pid; m.userData.gMat = gMat(m.userData.gid);
  }
  const wm = new THREE.MeshBasicMaterial({ color: 0x1a1614 });
  for (const sx of [-1, 1]) for (const [w, r, bone] of LINES) add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(w.map(p => new THREE.Vector3(p[0] * sx, p[1], p[2]))), 14, r, 5), wm, () => [[bone || 'head', 1]]);
  root.userData.rig = rig; return root;
}
const VIEWS = [['FRONT', 0, 1.0, 0], ['THREE-QUARTER', .7, 1.25, -.16], ['SIDE', Math.PI / 2, 1.45, -.3], ['BACK', Math.PI, 1.0, 0]], PXU = 470, Y0 = -.1, Y1 = 2.12;
async function main() {
  const st = $('status'), silas = await buildSilas(t => st.textContent = t), scene = new THREE.Scene(); scene.add(silas);
  const view = $('view'), R = new THREE.WebGLRenderer({ canvas: view, antialias: false, preserveDrawingBuffer: true }); R.outputColorSpace = THREE.LinearSRGBColorSpace;
  const pipe = new InkPipeline(R); let bg = setPreset('sheet').bg;
  const draw = (cam, w, h, ss = 2) => {
    const pxu = cam.isOrthographicCamera ? w / (cam.right - cam.left) : h / (2 * cam.position.distanceTo(TGT) * Math.tan(cam.fov * Math.PI / 360));
    R.setPixelRatio(1); R.setSize(w * ss, h * ss, false); pipe.render(scene, cam, bg, ss * Math.sqrt(pxu / 470));
  };
  const TGT = new THREE.Vector3(0, 1, -.1);
  const grab = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(view, 0, 0, w, h); return c; };
  /* harness: part-ID map of the model, pixel-aligned with a reference view at 1/3 reference resolution */
  const idMats = {};
  window.idShot = name => {
    const V = REFD.vm[name], k = 3, w = Math.ceil(V.w / k), h = Math.ceil(V.h / k), pxu = V.s / k, rt = new THREE.WebGLRenderTarget(w, h), x0 = -V.cx / V.s, y1 = V.gy / V.s;
    const cam = new THREE.OrthographicCamera(x0, x0 + w / pxu, y1, y1 - h / pxu, .1, 20); cam.position.set(0, 0, 8); silas.rotation.y = { front: 0, side: Math.PI / 2, back: Math.PI }[name]; const saved = [];
    silas.traverse(o => { if (!o.isMesh) return; saved.push([o, o.material, o.visible]); const id = o.userData.pid; if (id === undefined || id < 0) { o.visible = false; return; }
      o.material = idMats[id] || (idMats[id] = new THREE.MeshBasicMaterial({ color: new THREE.Color(id * 12 / 255, id * 12 / 255, id * 12 / 255), side: THREE.DoubleSide })); });
    if (idMats[14]) { idMats[14].polygonOffset = true; idMats[14].polygonOffsetFactor = -4; idMats[14].polygonOffsetUnits = -4; }
    R.setRenderTarget(rt); R.setClearColor(0, 1); R.clear(); R.render(scene, cam); const buf = new Uint8Array(w * h * 4); R.readRenderTargetPixels(rt, 0, 0, w, h, buf); R.setRenderTarget(null);
    for (const [o, m, v] of saved) { o.material = m; o.visible = v; } rt.dispose();
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), im = x.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) { const s = ((h - 1 - y) * w + i) * 4, d = (y * w + i) * 4; im.data[d] = im.data[d + 1] = im.data[d + 2] = buf[s]; im.data[d + 3] = 255; }
    x.putImageData(im, 0, 0); return c.toDataURL('image/png');
  };
  const pcam = new THREE.PerspectiveCamera(28, 1, .1, 30);
  const aim = (yw, pt, dist = 4.5, ty = 1.0, tz = -.1) => { silas.rotation.y = yw; pcam.position.set(0, ty + Math.sin(pt) * dist, tz + Math.cos(pt) * dist); pcam.lookAt(0, ty, tz); TGT.set(0, ty, tz); };
  /* harness: perspective still (900x900, supersampled) */
  window.shot = (yw, pt, dist, ty, preset) => { if (preset) bg = setPreset(preset).bg; aim(yw, pt, dist, ty); draw(pcam, 900, 900); const u = grab(900, 900).toDataURL('image/png'); bg = setPreset('sheet').bg; return u; };
  /* model sheet: orthographic views side by side */
  window.sheet = (views = VIEWS, preset = 'sheet') => {
    bg = setPreset(preset).bg; const tw = views.reduce((a, v) => a + v[2], 0), SW = Math.round(tw * PXU), SH = Math.round((Y1 - Y0) * PXU), c = document.createElement('canvas'); c.width = SW; c.height = SH; const x = c.getContext('2d'); let px = 0;
    for (const [name, yaw, w, off] of views) {
      const pw = Math.round(w * PXU), cam = new THREE.OrthographicCamera(-w / 2, w / 2, Y1, Y0, .1, 20); cam.position.set(off, 0, 8); silas.rotation.y = yaw; draw(cam, pw, SH); x.drawImage(grab(pw, SH), px, 0);
      x.fillStyle = '#2a2622'; x.font = '600 20px ui-monospace,monospace'; x.fillText(name, px + 16, 30); px += pw;
    }
    x.strokeStyle = 'rgba(40,36,30,.22)'; x.lineWidth = 1.5; for (const gy of GUIDES) { const py = (Y1 - gy) / (Y1 - Y0) * SH; x.beginPath(); x.moveTo(0, py); x.lineTo(SW, py); x.stroke(); }
    bg = setPreset('sheet').bg; return c;
  };
  /* harness: orthographic crop of the model in a reference view's own coordinates (u = x for front/back, z for side) */
  window.orthoCrop = (name, u0, u1, y0, y1, pxu = 1935, preset = 'sheet') => {
    bg = setPreset(preset).bg; const w = Math.round((u1 - u0) * pxu), h = Math.round((y1 - y0) * pxu), cam = new THREE.OrthographicCamera(u0, u1, y1, y0, .1, 20); cam.position.set(0, 0, 8);
    silas.rotation.y = { front: 0, side: Math.PI / 2, back: Math.PI }[name]; draw(cam, w, h, 2); const u = grab(w, h).toDataURL('image/png'); bg = setPreset('sheet').bg; return u;
  };
  window.sheetURL = (views, preset) => sheet(views, preset).toDataURL('image/png');
  const rig = silas.userData.rig; window.SILAS = { silas, scene, R, pipe, rig };
  window.pose = (name, arg) => { const p = POSES[name]; applyPose(rig, typeof p == 'function' ? p(arg) : p); silas.updateMatrixWorld(true); };
  if (QS.has('harness')) { window.READY = true; st.textContent = 'harness'; return; }
  const sc = sheet(), sh = $('sheet'); sh.width = sc.width; sh.height = sc.height; sh.getContext('2d').drawImage(sc, 0, 0);
  view.style.display = 'block'; let yaw = .6, pitch = .08, auto = true, drag = null;
  view.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY, yaw, pitch]; auto = false; view.setPointerCapture(e.pointerId); });
  view.addEventListener('pointermove', e => { if (drag) { yaw = drag[2] + (e.clientX - drag[0]) * .01; pitch = Math.max(-.5, Math.min(.9, drag[3] + (e.clientY - drag[1]) * .006)); } });
  view.addEventListener('pointerup', () => drag = null);
  st.textContent = 'drag to rotate'; window.READY = true;
  const loop = t => { if (auto) yaw = .6 + t * .0005; aim(yaw, pitch); draw(pcam, 900, 900, Math.min(2, devicePixelRatio)); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
}
main();
