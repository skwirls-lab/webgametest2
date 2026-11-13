/* ===== Silas: build the character and return a THREE.Group with a control API in .userData.api ===== */
const INKVIEWS = { hood: [0, 0, 0], tail: [0, 1, 0], cloak: [1, 1, 1], trousers: [1, 1, 1], shins: [1, 1, 1], feet: [1, 1, 1], tunic: [1, 1, 0], belt: [1, 0, 0], hands: [1, 0, 1], sleeves: [1, 0, 1], bracers: [1, 0, 1], cape: [1, 1, 1], head: [1, 1, 1], ears: [1, 1, 1] };
async function buildSilas(onProgress) {
  buildInkTextures(); const root = new THREE.Group(), rig = buildSkeleton(); root.add(rig.root);
  const add = (geo, mat, fn) => { skinGeometry(geo, fn, rig.index); const m = new THREE.SkinnedMesh(geo, mat); m.frustumCulled = false; m.bind(rig.skeleton, new THREE.Matrix4()); root.add(m); return m; };
  for (const [i, p] of PARTS.entries()) {
    onProgress && onProgress('sculpting ' + p.name + ' (' + (i + 1) + '/' + PARTS.length + ')'); await new Promise(r => setTimeout(r, 0));
    const m = add(sculpt(p), colorMat(p.c, p.gloss, p.ink === undefined ? INKVIEWS[p.name] : p.ink, REFD.parts.indexOf(p.name), p.mkLine), SKIN[p.name]);
    if (p.hidden) m.visible = false; if (['head', 'throat', 'jaw', 'ears', 'hands', 'shins', 'feet', 'tail'].includes(p.name)) m.material.uniforms.uFur.value = 1;
    m.name = p.name; m.userData.pid = REFD.parts.indexOf(p.pid || p.name); m.userData.gid = p.gid || m.userData.pid; m.userData.gMat = gMat(m.userData.gid);
  }
  const wm = new THREE.MeshBasicMaterial({ color: 0x1a1614 });
  for (const sx of [-1, 1]) for (const [w, r, bone] of LINES) add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(w.map(p => new THREE.Vector3(p[0] * sx, p[1], p[2]))), 14, r, 5), wm, () => [[bone == 'brow' ? (sx > 0 ? 'browL' : 'browR') : bone || 'head', 1]]);
  root.userData.rig = rig;
  /* ---- control API ---- */
  const part = n => root.children.find(o => o.name == n);
  const api = root.userData.api = {
    /* pose('sprint', phase) | pose('stand') | pose({bone: [rx, ry, rz], ...}) */
    pose(name, arg) { const p = typeof name == 'object' ? name : typeof POSES[name] == 'function' ? POSES[name](arg) : POSES[name]; applyPose(rig, p); part('drawn').visible = !!p.drawn; part('daggers').visible = !p.drawn; root.updateMatrixWorld(true); return p; },
    /* state('normal') | state('azure', amount 0..1): glowing eyes, veins spreading from the eyes */
    state(name, amount = 1) { const e = part('eyes').material.uniforms, az = name == 'azure';
      e.uC0.value.set(...(az ? [.35, .85, 1] : COL.eye)); e.uC2.value.set(...(az ? [.1, .55, 1] : COL.iris)); e.uGlow.value.set(az ? .25 : 0, az ? .3 : 0, az ? .3 : 0); LOOK.uVein.value = az ? amount : 0; },
    /* look('sheet' | 'grey' | 'moon' | 'violet' | 'azure') -> background colour for that lighting preset */
    look: name => setPreset(name).bg,
    /* secondary motion: call every frame after pose(); t in seconds, speed 0..1 */
    sway(t, speed = .3) { for (let i = 0; i < 7; i++) rig.bones['tail' + i].rotation.z += Math.sin(t * 5 - i * .9) * .05 * (1 + speed) * (i / 6); for (let i = 1; i < 4; i++) { const b = rig.bones['cloak' + i]; b.rotation.x += Math.sin(t * 6 - i * 1.1) * .05 * speed * i; b.rotation.z += Math.sin(t * 4.3 - i) * .03 * speed * i; } },
    poses: Object.keys(POSES), parts: PARTS.map(p => p.name)
  };
  return root;
}
