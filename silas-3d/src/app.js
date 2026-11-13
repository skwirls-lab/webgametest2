/* ===== Page: builds Silas, exposes harness hooks, draws the model sheet and the viewer ===== */
THREE.ColorManagement.enabled = false;
const $ = id => document.getElementById(id), QS = new URLSearchParams(location.search);
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
  /* pose sheet: named poses side by side from one camera */
  window.poseSheet = (list, yaw = .55, preset = 'sheet', cw = 520, ch = 640) => {
    bg = setPreset(preset).bg; const c = document.createElement('canvas'); c.width = cw * list.length; c.height = ch; const x = c.getContext('2d');
    list.forEach(([name, arg, yw], i) => { pose(name, arg); const cam = new THREE.PerspectiveCamera(26, cw / ch, .1, 30); silas.rotation.y = yw ?? yaw; cam.position.set(0, 1.15, 5.6); cam.lookAt(0, .95, -.15); TGT.set(0, .95, -.15); draw(cam, cw, ch); x.drawImage(grab(cw, ch), i * cw, 0);
      x.fillStyle = preset == 'sheet' ? '#2a2622' : '#cfd8ff'; x.font = '600 18px ui-monospace,monospace'; x.fillText(name.toUpperCase(), i * cw + 14, 26); });
    pose('stand'); bg = setPreset('sheet').bg; return c.toDataURL('image/png');
  };
  /* gate 4 check: share of part-boundary pixels that carry ink in the finished frame (front view) */
  window.inkCoverage = yaw => {
    bg = setPreset('flat').bg; const w = 500, h = 1040, cam = new THREE.OrthographicCamera(-.5, .5, Y1, Y0, .1, 20); cam.position.set(0, 0, 8); silas.rotation.y = yaw; draw(cam, w, h, 2);
    const W2 = w * 2, H2 = h * 2, g = new Uint8Array(W2 * H2 * 4), f = new Uint8Array(W2 * H2 * 4); R.readRenderTargetPixels(pipe.rtG, 0, 0, W2, H2, g);
    const gl = R.getContext(); gl.readPixels(0, 0, W2, H2, gl.RGBA, gl.UNSIGNED_BYTE, f); let edge = 0, inked = 0; const id = i => Math.round(g[i * 4 + 2] / 255 * 40), dark = i => f[i * 4] + f[i * 4 + 1] + f[i * 4 + 2] < 150;
    for (let y = 3; y < H2 - 3; y += 2) for (let x = 3; x < W2 - 3; x += 2) { const i = y * W2 + x; if (id(i) == id(i + 1) && id(i) == id(i + W2)) continue; edge++; let ok = false; for (let dy = -2; dy <= 2 && !ok; dy++) for (let dx = -2; dx <= 2; dx++) if (dark(i + dy * W2 + dx)) { ok = true; break; } if (ok) inked++; }
    bg = setPreset('sheet').bg; return inked / edge;
  };
  window.frameMs = () => { aim(.6, .08); const t0 = performance.now(); for (let i = 0; i < 12; i++) { silas.rotation.y = .6 + i * .1; draw(pcam, 900, 900, 1); const gl = R.getContext(), px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } return (performance.now() - t0) / 12; };
  window.sheetURL = (views, preset) => sheet(views, preset).toDataURL('image/png');
  const rig = silas.userData.rig; window.SILAS = { silas, scene, R, pipe, rig };
  window.pose = silas.userData.api.pose; window.state = silas.userData.api.state;
  if (QS.has('harness')) { window.READY = true; st.textContent = 'harness'; return; }
  const sc = sheet(), sh = $('sheet'); sh.width = sc.width; sh.height = sc.height; sh.getContext('2d').drawImage(sc, 0, 0);
  view.style.display = 'block'; let yaw = .6, pitch = .08, auto = true, drag = null;
  view.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY, yaw, pitch]; auto = false; view.setPointerCapture(e.pointerId); });
  view.addEventListener('pointermove', e => { if (drag) { yaw = drag[2] + (e.clientX - drag[0]) * .01; pitch = Math.max(-.5, Math.min(.9, drag[3] + (e.clientY - drag[1]) * .006)); } });
  view.addEventListener('pointerup', () => drag = null);
  /* viewer controls */
  let curPose = 'stand', curLook = 'sheet', azure = false; const ui = $('ui'), api = silas.userData.api;
  const btn = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; ui.appendChild(b); };
  for (const n of api.poses) btn(n, () => { curPose = n; });
  ui.appendChild(document.createElement('br'));
  for (const n of ['sheet', 'grey', 'moon', 'violet', 'azure']) btn('light: ' + n, () => { curLook = n; });
  btn('azure eyes on/off', () => { azure = !azure; });
  st.textContent = 'drag to rotate'; window.READY = true;
  const loop = t => {
    if (auto) yaw = .6 + t * .0003; const tw = Math.floor(t / 1000 * 12) / 12;                      // character poses on twos
    api.pose(curPose, curPose == 'sprint' ? tw * 2.2 % 1 : 0); api.sway(tw, curPose == 'sprint' ? 1 : .3); api.state(azure ? 'azure' : 'normal', 1); bg = api.look(curLook); INKU.uBoil.value = Math.floor(t / 1000 * 12) * 1.7;
    aim(yaw, pitch, curPose == 'allFours' || curPose == 'leap' ? 5.2 : 4.5); draw(pcam, 900, 900, Math.min(2, devicePixelRatio)); requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
main();
