/* ===== Rig: skeleton, automatic skin weights, poses, secondary motion ===== */
const BONE_DEFS = [
  ['hips', null, [0, .86, -.06]], ['spine', 'hips', [0, 1.03, -.06]], ['chest', 'spine', [0, 1.25, -.06]], ['neck', 'chest', [0, 1.5, -.04]], ['head', 'neck', [0, 1.64, -.02]],
  ['earL', 'head', [.1, 1.86, -.06]], ['earR', 'head', [-.1, 1.86, -.06]],
  ['armL', 'chest', [.2, 1.37, -.1]], ['foreL', 'armL', [.3, 1.15, -.12]], ['handL', 'foreL', [.325, .95, -.105]],
  ['armR', 'chest', [-.2, 1.37, -.1]], ['foreR', 'armR', [-.3, 1.15, -.12]], ['handR', 'foreR', [-.325, .95, -.105]],
  ['thighL', 'hips', [.1, .8, -.05]], ['shinL', 'thighL', [.145, .53, -.05]], ['footL', 'shinL', [.135, .31, -.13]],
  ['thighR', 'hips', [-.1, .8, -.05]], ['shinR', 'thighR', [-.145, .53, -.05]], ['footR', 'shinR', [-.135, .31, -.13]],
  ['tail0', 'hips', [0, .88, -.2]], ['tail1', 'tail0', [0, .9, -.36]], ['tail2', 'tail1', [0, .95, -.47]], ['tail3', 'tail2', [0, 1.12, -.47]], ['tail4', 'tail3', [0, 1.34, -.44]], ['tail5', 'tail4', [0, 1.5, -.47]], ['tail6', 'tail5', [0, 1.57, -.57]],
  ['cloak1', 'chest', [0, 1.25, -.25]], ['cloak2', 'cloak1', [0, .95, -.27]], ['cloak3', 'cloak2', [0, .65, -.3]]
];
const TAILPTS = [[.88, -.2], [.9, -.36], [.95, -.47], [1.12, -.47], [1.34, -.44], [1.5, -.47], [1.57, -.57], [1.42, -.71]];
const ss = S.ss, sd = x => x >= 0 ? 'L' : 'R';
const SKIN = {
  tail(x, y, z) {
    let best = 0, bt = 0, bd = 1e9;
    for (let i = 0; i < 7; i++) { const a = TAILPTS[i], b = TAILPTS[i + 1], dy = b[0] - a[0], dz = b[1] - a[1], t = S.clamp(((y - a[0]) * dy + (z - a[1]) * dz) / (dy * dy + dz * dz), 0, 1), d = Math.hypot(y - a[0] - dy * t, z - a[1] - dz * t); if (d < bd) { bd = d; best = i; bt = t; } }
    const up = .5 * ss(.55, 1, bt), dn = best > 0 ? .5 * ss(.45, 0, bt) : 0, o = [['tail' + best, 1 - up - dn]];
    if (up > 0 && best < 6) o.push(['tail' + (best + 1), up]); else o[0][1] += up; if (dn > 0) o.push(['tail' + (best - 1), dn]); return o;
  },
  cloak(x, y, z) { const c = [['chest', 1.36], ['cloak1', 1.1], ['cloak2', .8], ['cloak3', .5]], o = []; for (let i = 0; i < 4; i++) { const w = Math.max(0, 1 - Math.abs(y - c[i][1]) / .3); if (w > 0) o.push([c[i][0], w]); } if (y >= 1.36) return [['chest', 1]]; if (y <= .5) return [['cloak3', 1]]; return o; },
  cape(x, y, z) { const a = ss(.17, .3, Math.abs(x)) * ss(1.46, 1.3, y) * .5; return [['chest', 1 - a], ['arm' + sd(x), a]]; },
  tunic(x, y, z) { const c = ss(1.1, 1.25, y), h = ss(1.02, .92, y), t = ss(1.0, .8, y) * .5 * ss(.02, .1, Math.abs(x)); return [['chest', c], ['spine', Math.max(0, 1 - c - h)], ['hips', h * (1 - t)], ['thigh' + sd(x), h * t]]; },
  belt: () => [['spine', .6], ['hips', .4]], buckle: () => [['spine', .6], ['hips', .4]], daggers: () => [['hips', 1]], pendant: () => [['chest', 1]],
  sleeves(x, y, z) { const a = ss(1.42, 1.32, y), e = ss(1.2, 1.12, y) * .5; return [['chest', 1 - a], ['arm' + sd(x), a - e], ['fore' + sd(x), e]]; },
  bracers(x, y, z) { const a = ss(1.1, 1.16, y) * .4; return [['fore' + sd(x), 1 - a], ['arm' + sd(x), a]]; },
  hands: (x) => [['hand' + sd(x), 1]],
  trousers(x, y, z) { const th = ss(.9, .76, y) * ss(.0, .05, Math.abs(x)), k = ss(.6, .46, y); return [['hips', 1 - th], ['thigh' + sd(x), th * (1 - k)], ['shin' + sd(x), th * k]]; },
  shins: (x) => [['foot' + sd(x), 1]], feet: (x) => [['foot' + sd(x), 1]],
  head: () => [['head', 1]],
  throat(x, y, z) { const n = ss(1.6, 1.46, y); return [['head', 1 - n], ['chest', n]]; }, clasp: () => [['chest', 1]],
  jaw: () => [['head', 1]], eyes: () => [['head', 1]], nose: () => [['head', 1]], ears: (x) => [['ear' + sd(x), 1]]
};
function buildSkeleton() {
  const bones = {}, world = {}, list = [];
  for (const [n, p, w] of BONE_DEFS) { const b = new THREE.Bone(); b.name = n; world[n] = w; const pw = p ? world[p] : [0, 0, 0]; b.position.set(w[0] - pw[0], w[1] - pw[1], w[2] - pw[2]); if (p) bones[p].add(b); bones[n] = b; list.push(b); }
  bones.hips.updateMatrixWorld(true);
  return { bones, list, root: bones.hips, skeleton: new THREE.Skeleton(list), index: Object.fromEntries(list.map((b, i) => [b.name, i])) };
}
function skinGeometry(geo, fn, index) {
  const P = geo.attributes.position, n = P.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const w = fn(P.getX(i), P.getY(i), P.getZ(i)).filter(q => q[1] > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4); let t = 0; for (const q of w) t += q[1];
    w.forEach((q, k) => { si[i * 4 + k] = index[q[0]]; sw[i * 4 + k] = q[1] / t; });
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
}
/* poses: bone -> [rx, ry, rz] in radians (world-aligned bones: -x swings a hanging limb forward, +x leans the spine forward). hipsY/hipsZ move the root. */
const POSES = {
  stand: {},
  sprint(ph) {
    const p = ph * Math.PI * 2, s = Math.sin(p), c = Math.cos(p), leg = (q, sgn) => ({ th: -.25 - 1.0 * q, sh: .35 + 1.5 * Math.max(0, sgn), ft: .25 + .5 * q });
    const L = leg(s, c), Rr = leg(-s, -c);
    return { hipsY: -.06 + .05 * Math.abs(s), hips: [.38, 0, 0], spine: [.12, .1 * s, 0], chest: [.1, .12 * s, 0], neck: [-.25, 0, 0], head: [-.28, 0, 0], earL: [-.5, 0, 0], earR: [-.5, 0, 0],
      thighL: [L.th, 0, 0], shinL: [L.sh, 0, 0], footL: [L.ft, 0, 0], thighR: [Rr.th, 0, 0], shinR: [Rr.sh, 0, 0], footR: [Rr.ft, 0, 0],
      armL: [1.0 * s - .1, 0, .12], foreL: [-1.5, 0, 0], armR: [-1.0 * s - .1, 0, -.12], foreR: [-1.5, 0, 0],
      tail0: [-.75, 0, 0], tail1: [-.35, 0, 0], tail2: [-.3, 0, 0], tail3: [.25 + .12 * s, 0, 0], tail4: [.3, 0, 0], tail5: [.35 - .1 * s, 0, 0], tail6: [.2, 0, 0],
      cloak1: [.95 + .08 * s, 0, 0], cloak2: [.25 + .1 * c, 0, 0], cloak3: [.15 - .12 * s, 0, 0] };
  }
};
function applyPose(rig, pose) {
  for (const b of rig.list) b.rotation.set(0, 0, 0);
  rig.root.position.set(0, .86 + (pose.hipsY || 0), -.06 + (pose.hipsZ || 0));
  for (const k in pose) if (rig.bones[k]) rig.bones[k].rotation.set(...pose[k]);
}
