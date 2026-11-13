/* ============ SILAS: 2D ink rig (side view) + hero close-up ============ */
const SC = {
  fur: '#8f8e9d', furD: '#6c6b7c', furL: '#b9bac9', white: '#eff2fa', cloak: '#b4662c', cloakD: '#7d4420', green: '#5c8a55', cream: '#d6c89e',
  leather: '#6d452a', belt: '#4d2f1c', trou: '#4b3c35', steel: '#cdd7ea', ear: '#b88d94', nose: '#7c5560', eye: '#100d16', pend: '#8a5a2e'
};
function poseRun(ph) {
  const p = ph * TAU, s = Math.sin(p), c = Math.cos(p);
  return {
    lean: .5, hy: -146 - 16 * Math.abs(s), thN: .2 + 1.05 * s, knN: .25 + 1.6 * Math.max(0, c), ftN: .45 - .6 * s + .45 * c,
    thF: .2 - 1.05 * s, knF: .25 + 1.6 * Math.max(0, -c), ftF: .45 + .6 * s - .45 * c,
    shN: -1.2 * s + .1, elN: 1.55, shF: 1.2 * s + .1, elF: 1.55, head: -.3, brow: .8, mouth: .9, ear: .4,
    cloakA: Math.PI + .22, cloakL: 250, cloakAmp: 17, cloakDroop: 10,
    tail: [[-20, -8], [-90, 4], [-170, 0], [-245, -30], [-300, -90]], tailW: 6
  };
}
const POSE = {
  skid: { lean: -.42, ground: 1, thN: 1.15, knN: .12, ftN: -.35, thF: .25, knF: 1.5, ftF: .7, shN: -1.2, elN: .5, shF: 1.3, elF: .7, head: .35, brow: .2, mouth: 1, ear: .1, cloakA: Math.PI * 1.62, cloakL: 230, cloakAmp: 20, cloakDroop: 0, tail: [[-20, -12], [-80, -60], [-90, -160], [-40, -240], [40, -270]], tailW: 5 },
  ready: { lean: .22, ground: 1, thN: .75, knN: 1.0, ftN: .05, thF: -.55, knF: .25, ftF: .25, shN: .55, elN: 1.3, shF: -.5, elF: .9, head: -.42, brow: .1, mouth: .5, ear: 0, cloakA: Math.PI * .62, cloakL: 215, cloakAmp: 5, cloakDroop: 0, tail: [[-20, -12], [-95, -20], [-150, -95], [-140, -200], [-80, -265]], tailW: 2 },
  brace: { lean: -.12, ground: 1, thN: .95, knN: .85, ftN: -.05, thF: -.7, knF: .2, ftF: .3, shN: 1.75, elN: 1.15, shF: 1.2, elF: 1.5, head: -.3, brow: -.6, mouth: .9, ear: .55, cloakA: Math.PI + .08, cloakL: 260, cloakAmp: 26, cloakDroop: -8, tail: [[-20, -12], [-110, -30], [-200, -70], [-290, -90], [-370, -70]], tailW: 9 }
};
function mixPose(a, b, k) {
  const o = {}; for (const key in a) { const u = a[key], v = b[key]; if (key == 'tail') o.tail = u.map((p, i) => [lerp(p[0], v[i][0], k), lerp(p[1], v[i][1], k)]); else if (typeof u == 'number' && typeof v == 'number') o[key] = lerp(u, v, k); else o[key] = k < .5 ? u : v; }
  for (const key in b) if (!(key in o)) o[key] = b[key];
  return o;
}
function furry(cl, wf, amt) { // tube outline with spiky fur tufts
  const n = cl.length, pts = tube(cl, wf);
  return pts.map((p, i) => { const c = cl[i < n ? i : 2 * n - 1 - i]; return i % 2 ? [c[0] + (p[0] - c[0]) * (1 + amt), c[1] + (p[1] - c[1]) * (1 + amt), 1] : p; });
}
function silas(x, y, s, face, P, tc, o = {}) {
  const pj = JIT, pb = BOIL; JIT = o.jit ?? 1.8; BOIL = Math.floor(tc * 12) * 3.7;
  const leg = (th, kn, ft) => { const K = [70 * Math.sin(th), 70 * Math.cos(th)], b = th - kn, A = [K[0] + 75 * Math.sin(b), K[1] + 75 * Math.cos(b)], T = [A[0] + 50 * Math.cos(ft), A[1] + 50 * Math.sin(ft)]; return { K, A, T }; };
  const LN = leg(P.thN, P.knN, P.ftN), LF = leg(P.thF, P.knF, P.ftF);
  let hy = P.hy || 0; if (P.ground) hy = -Math.max(LN.A[1] + 10, LN.T[1] + 9, LF.A[1] + 10, LF.T[1] + 9);
  g.save(); g.translate(x, y); g.scale(s * face * (P.sx ?? 1), s); g.translate(0, hy);
  const cl = Math.cos(P.lean), sl = Math.sin(P.lean), R = (lx, ly) => [lx * cl - ly * sl, lx * sl + ly * cl];
  const ow = o.ow ?? 5;
  // ---- tail
  const tl = P.tail.map((p, i) => [p[0], p[1] + Math.sin(tc * 15 - i * 1.2) * P.tailW * i]), tcl = cr(tl, 15);
  const twf = k => 24 + 88 * Math.pow(Math.sin(Math.PI * Math.pow(k, .72)), .8);
  const tp = furry(tcl, twf, .2);
  shape(() => sp(tp), { fill: SC.furL, ow: ow + 1, sh: 22, bk: 9, rw: 6 });
  g.fillStyle = SC.fur; g.beginPath(); sp(furry(tcl.slice(0, 15), k => twf(k) * .74, .22)); g.fill();
  for (let i = 3; i < 14; i += 2) { const p = tcl[i], q = tcl[i + 1]; stroke([[p[0], p[1]], [lerp(p[0], q[0], .5) + 6, lerp(p[1], q[1], .5) - 10], [q[0] + 4, q[1] - 2]], 4, SC.furD); }
  // ---- cloak
  const A0 = R(-22, -128), A1 = R(-30, -78), ca = P.cloakA, dx = Math.cos(ca), dy = Math.sin(ca), nx = dy, ny = -dx, cm = [(A0[0] + A1[0]) / 2, (A0[1] + A1[1]) / 2];
  const top = [], bot = [], N = 6;
  for (let i = 1; i <= N; i++) {
    const k = i / N, L = P.cloakL * k, wv = Math.sin(k * 5.5 - tc * 17) * P.cloakAmp * k, wv2 = Math.sin(k * 5 - tc * 17 - .9) * P.cloakAmp * k, hw = 22 + 40 * k, dr = k * k * P.cloakDroop;
    top.push([cm[0] + dx * L + nx * (hw + wv), cm[1] + dy * L + ny * (hw + wv) + dr]); bot.push([cm[0] + dx * L - nx * (hw - wv2), cm[1] + dy * L - ny * (hw - wv2) + dr]);
  }
  const te = top[N - 1], be = bot[N - 1], tat = []; te[2] = 1; be[2] = 1;
  for (let i = 1; i < 7; i++) { const k = i / 7, ext = (i % 2 ? -34 : 6) - hash(i, 3) * 16; tat.push([lerp(te[0], be[0], k) + dx * ext, lerp(te[1], be[1], k) + dy * ext, 1]); }
  const cpts = [A0, ...top, ...tat, ...bot.reverse(), A1];
  shape(() => sp(cpts), { fill: SC.cloak, ow: ow + 1, sh: 20, bk: 7, rw: 5 });
  inside(() => sp(cpts), () => {
    for (const f of [-.55, .05, .6]) { const ln = []; for (let i = 0; i <= 8; i++) { const k = .1 + i / 8 * (.6 + .25 * Math.abs(f)), L = P.cloakL * k, wv = Math.sin(k * 5.5 - tc * 17) * P.cloakAmp * k, hw = (22 + 40 * k) * f; ln.push([cm[0] + dx * L + nx * (hw + wv), cm[1] + dy * L + ny * (hw + wv) + k * k * P.cloakDroop]); } stroke(ln, 5, f > .3 ? INK : SC.cloakD); }
  });
  for (const [k, f, r] of [[.78, .35, 9], [.88, -.3, 7]]) { const L = P.cloakL * k, wv = Math.sin(k * 5.5 - tc * 17) * P.cloakAmp * k, hw = (22 + 40 * k) * f; shape(() => sp(ell(cm[0] + dx * L + nx * (hw + wv), cm[1] + dy * L + ny * (hw + wv), r * 1.5, r, ca, 7)), { fill: '#0a1024', ow: 3, flat: 1 }); }
  // ---- limbs
  const drawLeg = (L, far) => {
    const f = far ? .62 : 1, fur = shade(SC.fur, f), tr = shade(SC.trou, f), mid = [lerp(L.K[0], L.A[0], .62), lerp(L.K[1], L.A[1], .62)], u = [(L.T[0] - L.A[0]) / 50, (L.T[1] - L.A[1]) / 50];
    shape(() => sp(cap(mid[0], mid[1], L.A[0], L.A[1], 15, 13)), { fill: fur, ow, sh: 5, bk: 2, rw: 3 });
    shape(() => sp(cap(L.A[0] - u[0] * 7, L.A[1] - u[1] * 7, L.T[0], L.T[1], 16, 20)), { fill: fur, ow, sh: 6, bk: 2, rw: 3 });
    stroke([[L.T[0] + u[0] * 2 - u[1] * 3, L.T[1] + u[1] * 2 + u[0] * 3], [L.T[0] - u[0] * 9 - u[1] * 2, L.T[1] - u[1] * 9 + u[0] * 2]], 2.5);
    shape(() => sp(cap(L.K[0], L.K[1], mid[0], mid[1], 35, 31)), { fill: tr, ow, sh: 9, bk: 4, rw: 3.5 });
    shape(() => sp(cap(0, 0, L.K[0], L.K[1], 44, 36)), { fill: tr, ow, sh: 10, bk: 4, rw: 3.5 });
    stroke([[lerp(0, L.K[0], .3) - 6, lerp(0, L.K[1], .3)], [L.K[0] - 4, L.K[1] - 6]], 3.5);
  };
  const drawArm = (S, sh, el, far) => {
    const f = far ? .62 : 1, E = [S[0] + 54 * Math.sin(sh), S[1] + 54 * Math.cos(sh)], b = sh + el, Hd = [E[0] + 60 * Math.sin(b), E[1] + 60 * Math.cos(b)], Wr = [lerp(E[0], Hd[0], .8), lerp(E[1], Hd[1], .8)];
    shape(() => sp(ell(Hd[0], Hd[1], 14, 13, b, 8)), { fill: shade(SC.fur, f), ow, sh: 5, bk: 2, rw: 3 });
    shape(() => sp(cap(S[0], S[1], E[0], E[1], 30, 25)), { fill: shade(SC.cream, f), ow, sh: 8, bk: 3, rw: 3.5 });
    shape(() => sp(cap(E[0], E[1], Wr[0], Wr[1], 26, 20)), { fill: shade(SC.leather, f), ow, sh: 7, bk: 3, rw: 3.5 });
    for (const k of [.3, .55, .8]) { const px = lerp(E[0], Wr[0], k), py = lerp(E[1], Wr[1], k), ux = Math.cos(b), uy = -Math.sin(b); stroke([[px - ux * 6, py - uy * 6], [px + ux * 6, py + uy * 6]], 2.2); }
  };
  drawArm(R(10, -104), P.shF, P.elF, 1);
  shape(() => sp(ell(0, 0, 30, 28)), { fill: SC.trou, ow, flat: 1 });
  drawLeg(LF, 1); drawLeg(LN, 0);
  // ---- torso (in leaning frame)
  g.save(); g.rotate(P.lean); g.scale(1.16, 1.03);
  const tun = [[-24, -118], [18, -122], [31, -84], [27, -30], [31, 12], [23, 36, 1], [14, 18, 1], [4, 40, 1], [-7, 21, 1], [-17, 37, 1], [-27, 16, 1], [-31, -30], [-30, -90]];
  shape(() => sp(tun), { fill: SC.green, ow, sh: 12, bk: 4, rw: 4 });
  inside(() => sp(tun), () => { g.fillStyle = SC.cream; g.beginPath(); sp([[9, -130], [50, -130], [50, 50], [6, 50], [8, -40]]); g.fill(); g.fillStyle = HT(LT.ht, 9, .3); g.beginPath(); sp([[9, -40], [50, -60], [50, -26], [7, -22]]); g.fill(); stroke([[10, -122], [8, -40], [6, 34]], 3.5); stroke([[-18, 4], [-14, 22]], 3); });
  shape(() => sp([[-32, -27, 1], [33, -23, 1], [33, -9, 1], [-32, -13, 1]]), { fill: SC.belt, ow: ow * .8, sh: 4, bk: 0, rw: 2 });
  shape(() => sp([[14, -24, 1], [25, -23, 1], [25, -9, 1], [14, -10, 1]]), { fill: SC.steel, ow: 2.5, flat: 1 });
  // dagger at the hip
  shape(() => sp([[-13, -3, 1], [-1, 3, 1], [-27, 50, 1]]), { fill: SC.steel, ow: ow * .8, sh: 5, bk: 0, rw: 2 });
  shape(() => sp(cap(-16, -7, 5, 2, 6, 6)), { fill: SC.steel, ow: 3, flat: 1 });
  shape(() => sp(cap(-3, -5, 5, -25, 9, 8)), { fill: SC.leather, ow: 3, flat: 1 });
  // pendant
  stroke([[16, -118], [22, -98]], 2); shape(() => sp([[22, -100, 1], [28, -92], [23, -82, 1], [18, -91]]), { fill: SC.pend, ow: 2.5, flat: 1 });
  // hood / cowl
  const hood = [[-40, -90], [-54, -122], [-38, -152], [-8, -152], [22, -140], [39, -121], [31, -100], [8, -95, 1], [-14, -88]];
  shape(() => sp(hood), { fill: SC.cloak, ow, sh: 11, bk: 4, rw: 4 });
  stroke([[-40, -128], [-20, -118], [4, -104]], 3.5); shape(() => sp(ell(20, -106, 5, 5)), { fill: SC.pend, ow: 2.5, flat: 1 });
  g.restore();
  // ---- head
  const nk = R(4, -124), ha = P.lean * .5 + P.head;
  g.save(); g.translate(nk[0] + 12 * Math.cos(ha) + 52 * Math.sin(ha), nk[1] + 12 * Math.sin(ha) - 52 * Math.cos(ha)); g.rotate(ha); g.scale(1.3, 1.3);
  const ear = (ox, oy, far) => {
    g.save(); g.translate(-14 + ox, -40 + oy); g.rotate(-P.ear);
    const ep = [[-16, 4], [-22, -30], [-16, -64, 1], [-19, -80, 1], [-12, -68], [-8, -84, 1], [-4, -64], [8, -32], [16, 2]];
    shape(() => sp(ep), { fill: shade(SC.fur, far ? .62 : 1), ow, sh: 7, bk: 3, rw: 3 });
    if (!far) shape(() => sp([[-9, -2], [-14, -30], [-11, -58, 1], [2, -30], [6, -4]]), { fill: SC.ear, ow: 2.5, flat: 1 });
    g.restore();
  };
  ear(24, 3, 1);
  const hp = [[-46, -8], [-38, -38], [-8, -52], [24, -46], [44, -28], [56, -10], [66, 2], [68, 12], [60, 22], [46, 31], [28, 39], [10, 41], [0, 53, 1], [-8, 40], [-20, 52, 1], [-25, 36], [-36, 44, 1], [-40, 22]];
  shape(() => sp(hp), { fill: SC.fur, ow, sh: 12, bk: 4, rw: 4 });
  inside(() => sp(hp), () => {
    g.fillStyle = SC.white; g.beginPath(); sp([[80, 0], [55, 0], [42, 10], [24, 9], [8, 19], [-14, 27], [-48, 38], [-30, 70], [90, 70]]); g.fill();
    g.fillStyle = HT(LT.ht, 9, .3); g.beginPath(); sp([[-50, 20], [-10, 34], [30, 42], [20, 70], [-50, 60]]); g.fill();
    if (P.mouth > .3) { g.fillStyle = '#2a0e16'; g.beginPath(); sp([[62, 19, 1], [48, 21], [36, 27 + 4 * P.mouth], [46, 31 + 5 * P.mouth], [57, 25 + 3 * P.mouth]]); g.fill(); g.fillStyle = '#fff'; g.beginPath(); sp([[60, 19, 1], [48, 21], [40, 25], [55, 24]]); g.fill(); }
  });
  stroke([[64, 19], [48, 21], [35, 28]], 3);
  shape(() => sp([[63, 1], [71, 7], [65, 13], [60, 7]]), { fill: SC.nose, ow: 2.5, flat: 1 });
  g.fillStyle = SC.furL; g.beginPath(); sp(ell(28, -14, 17, 19, -.2)); g.fill();
  shape(() => sp(ell(28, -14, 13, 15.5, -.2)), { fill: SC.eye, ow: 2.5, flat: 1 });
  g.fillStyle = '#fff'; g.beginPath(); g.arc(33, -20, 4.2, 0, TAU); g.moveTo(26, -8); g.arc(24, -8, 2, 0, TAU); g.fill();
  stroke([[9, -34 - 6 * P.brow], [27, -36], [46, -29 + 8 * P.brow]], 6.5);
  stroke([[56, 16], [30, 24], [8, 22]], 1.8); stroke([[56, 19], [34, 32], [14, 36]], 1.8);
  ear(0, 0, 0);
  g.restore();
  drawArm(R(2, -104), P.shN, P.elN, 0);
  g.restore(); JIT = pj; BOIL = pb;
}

/* ---------------- stylised flame ---------------- */
function flame(x, y, w, h, f, seed, pw) {
  if (pw <= 0) return;
  const layer = (sc, col, ol) => {
    const pts = [[-w * .5 * sc, 0], [-w * .56 * sc, -h * .14 * sc]], n = 5;
    for (let i = 0; i < n; i++) {
      const u = (i - (n - 1) / 2) / ((n - 1) / 2), hh = h * sc * pw * (1 - Math.abs(u) * .45) * (.62 + .6 * hash(i + seed, f)), tx = u * w * .42 * sc + (hash(i, f + seed + 9) - .5) * w * .5 * sc, bx = u * w * .46 * sc;
      pts.push([bx - w * .1 * sc + (tx - bx) * .3, -hh * .55], [tx, -hh, 1], [bx + w * .12 * sc + (tx - bx) * .2, -hh * .5]);
      if (i < n - 1) pts.push([bx + w * .2 * sc, -h * sc * pw * (.16 + .14 * hash(i, f + 5))]);
    }
    pts.push([w * .56 * sc, -h * .14 * sc], [w * .5 * sc, 0], [0, h * .1 * sc]);
    if (ol) shape(() => sp(pts), { fill: col, ow: 6, ink: '#020a2a', flat: 1 }); else { g.fillStyle = col; g.beginPath(); sp(pts); g.fill(); }
    return pts;
  };
  g.save(); g.translate(x, y);
  glow(0, -h * .35, h * 1.5 * pw, 'rgba(20,110,255,.5)');
  layer(1, '#0c46d6', 1); const mid = layer(.8, '#1c9cff');
  inside(() => sp(mid), () => dots(-w, -h * 1.3, w, 20, 13, (px, py) => clamp(.75 + py / (h * .9)), '#8fe6ff'));
  layer(.56, '#86e8ff'); layer(.3, '#f4feff');
  for (let i = 0; i < 9 && pw > .5; i++) { // sparks & detached licks, on twos
    const k = ((f * .13 + hash(i, seed)) % 1), px = (hash(i, seed + 1) - .5) * w * 1.5 + Math.sin(k * 6 + i) * 20, py = -h * pw * (.3 + k * 1.15), s = (1 - k) * (8 + hash(i, seed + 2) * 14) * pw;
    g.fillStyle = i % 3 ? '#7fe0ff' : '#fff'; g.beginPath(); poly([[px, py - s * 1.6], [px + s * .6, py], [px, py + s], [px - s * .6, py]]); g.fill();
  }
  g.restore();
}

/* ---------------- hero close-up (faces LEFT, toward the creature) ---------------- */
let VEINS = null;
function buildVeins() {
  VEINS = []; const r = rng(77);
  const grow = (x, y, a, d, w, depth) => {
    const n = 4 + ((r() * 4) | 0);
    for (let i = 0; i < n; i++) {
      a += (r() - .5) * 1.1; const l = 16 + r() * 24, x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l;
      VEINS.push([x, y, x2, y2, d, w]); x = x2; y = y2; d += l; w *= .9;
      if (depth < 2 && r() < .3) grow(x, y, a + (r() < .5 ? 1 : -1) * (.5 + r() * .6), d, w * .7, depth + 1);
    }
  };
  for (const [ex, ey, rx, ry, a0, a1, n] of [[40, -15, 58, 66, .3, TAU - .2, 7], [-168, -32, 30, 52, 1.2, TAU - .9, 4]])
    for (let i = 0; i < n; i++) { const a = lerp(a0, a1, (i + r() * .6) / n); grow(ex + Math.cos(a) * rx, ey + Math.sin(a) * ry, a, 0, 7, 0); }
}
function paw(x, y, s, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  // forearm + bracer
  shape(() => sp(cap(30, 60, 150, 420, 120, 170)), { fill: SC.leather, ow: 9, sh: 30, bk: 12, rw: 9 });
  for (let i = 0; i < 5; i++) { const k = .12 + i * .16, px = lerp(30, 150, k) - 10, py = lerp(60, 420, k); stroke([[px - 22, py - 8], [px + 22, py + 10]], 5); stroke([[px - 22, py + 10], [px + 22, py - 8]], 5); }
  shape(() => sp(cap(10, 30, 40, 80, 118, 122)), { fill: SC.cream, ow: 8, sh: 14, bk: 5, rw: 6 });
  // open palm, fingers curled up around the flame
  shape(() => sp(cap(-70, -50, -92, -104, 40, 32)), { fill: SC.furD, ow: 7, sh: 10, bk: 4, rw: 5 });
  shape(() => sp(cap(-25, -60, -30, -122, 42, 32)), { fill: SC.furD, ow: 7, sh: 10, bk: 4, rw: 5 });
  shape(() => sp([[-104, -10], [-70, -50], [0, -62], [70, -48], [100, -6], [80, 44], [10, 62], [-70, 46]]), { fill: SC.fur, ow: 9, sh: 26, bk: 10, rw: 8 });
  shape(() => sp(cap(25, -56, 34, -116, 42, 32)), { fill: SC.fur, ow: 7, sh: 10, bk: 4, rw: 5 });
  shape(() => sp(cap(72, -40, 96, -92, 40, 30)), { fill: SC.fur, ow: 7, sh: 10, bk: 4, rw: 5 });
  shape(() => sp(cap(-92, 6, -138, -34, 44, 32)), { fill: SC.fur, ow: 7, sh: 10, bk: 4, rw: 5 });
  for (const [cx, cy, a] of [[-98, -116, -.4], [-31, -136, -.1], [36, -130, .1], [102, -104, .4], [-150, -44, -1.0]]) shape(() => sp(leafPts(cx, cy, 24, 8, a - Math.PI / 2)), { fill: '#23202c', ow: 3, flat: 1 });
  stroke([[-50, 0], [0, 14], [50, 2]], 5); stroke([[-20, 30], [20, 34]], 4);
  g.restore();
}
function silasClose(t, tc, p) {
  const f = Math.floor(tc * 12); JIT = 2.4; BOIL = f * 3.7;
  // tail behind
  const tcl = cr([[1620, 1200], [1760, 900], [1890, 640], [1880, 400], [1740, 250]], 15), twf = k => 150 + 230 * Math.pow(Math.sin(Math.PI * Math.pow(k, .8)), .8);
  const tp = furry(tcl.map((q, i) => [q[0] + Math.sin(tc * 5 + i * .5) * i * 1.2, q[1]]), twf, .13);
  shape(() => sp(tp), { fill: SC.furL, ow: 11, sh: 60, bk: 26, rw: 12, cell: 12 });
  g.fillStyle = SC.fur; g.beginPath(); sp(furry(tcl.slice(0, 15), k => twf(k) * .5, .3)); g.fill();
  for (let i = 3; i < 14; i += 2) { const a = tcl[i], b = tcl[i + 1]; stroke([[a[0] - 30, a[1]], [lerp(a[0], b[0], .5) + 10, lerp(a[1], b[1], .5) - 20], [b[0] + 20, b[1]]], 9, SC.furD); }
  g.save(); g.translate(1230, 505 + Math.sin(tc * 9) * 2.5); g.rotate(-.04 + p.tilt); g.scale(1.12, 1.12);
  // cloak over the shoulders + tunic
  const body = [[-300, 330], [-470, 470], [-560, 760], [700, 760], [600, 470], [420, 330], [200, 280], [-120, 280]];
  shape(() => sp(body), { fill: SC.cloak, ow: 11, sh: 46, bk: 20, rw: 11, cell: 12 });
  const chest = [[-250, 360], [-300, 520], [-320, 760], [60, 760], [80, 520], [30, 380]];
  shape(() => sp(chest), { fill: SC.green, ow: 9, sh: 30, bk: 12, rw: 9, cell: 12 });
  inside(() => sp(chest), () => { g.fillStyle = SC.cream; g.beginPath(); sp([[-260, 340], [-110, 340], [-130, 560], [-150, 780], [-340, 780], [-300, 520]]); g.fill(); stroke([[-108, 380], [-128, 560], [-146, 760]], 8); g.fillStyle = HT(LT.ht, 12, .34); g.beginPath(); sp([[-320, 360], [80, 360], [80, 470], [-320, 440]]); g.fill(); });
  stroke([[-240, 400], [-215, 520], [-195, 560]], 6); stroke([[-120, 400], [-170, 520], [-190, 560]], 6);
  shape(() => sp([[-192, 548, 1], [-150, 590], [-158, 640], [-196, 682, 1], [-226, 640], [-232, 590]]), { fill: SC.pend, ow: 7, sh: 10, bk: 4, rw: 5 });
  stroke([[-193, 560], [-195, 668]], 4); stroke([[-194, 600], [-168, 590]], 3); stroke([[-195, 625], [-218, 612]], 3);
  const hood = [[-200, 180], [-262, 250], [-318, 352], [-270, 440], [-120, 476], [50, 486], [230, 456], [345, 384], [372, 262], [330, 170], [250, 120], [0, 130]];
  shape(() => sp(hood), { fill: SC.cloak, ow: 11, sh: 40, bk: 16, rw: 11, cell: 12 });
  inside(() => sp(hood), () => { g.fillStyle = SC.cloakD; g.beginPath(); sp([[-230, 150], [-150, 250], [0, 300], [170, 280], [280, 200], [300, 100], [-200, 100]]); g.fill(); g.fillStyle = INK; g.beginPath(); sp([[-190, 170], [-100, 232], [20, 262], [150, 240], [215, 190], [200, 120], [-180, 120]]); g.fill(); });
  for (const ln of [[[-250, 300], [-150, 400], [20, 440]], [[330, 220], [300, 340], [160, 430]], [[-290, 380], [-200, 440], [-100, 455]], [[360, 300], [330, 390], [250, 440]], [[-150, 330], [-20, 390], [120, 380]], [[230, 300], [200, 370], [120, 410]]]) stroke(ln, 9);
  shape(() => sp(ell(-262, 410, 20, 20)), { fill: SC.pend, ow: 6, sh: 5, bk: 0, rw: 4 });
  // ears
  const earF = [[-150, -170], [-162, -260], [-142, -340], [-128, -385, 1], [-137, -418, 1], [-120, -390], [-111, -424, 1], [-103, -380], [-80, -300], [-52, -222]];
  const earN = [[70, -205], [104, -290], [150, -360], [168, -398, 1], [159, -434, 1], [178, -402], [187, -440, 1], [193, -396], [207, -330], [213, -250], [200, -170]];
  shape(() => sp(earF), { fill: SC.furD, ow: 10, sh: 20, bk: 8, rw: 8 });
  shape(() => sp([[-130, -190], [-136, -270], [-122, -358, 1], [-96, -290], [-76, -225]]), { fill: shade(SC.ear, .8), ow: 5, sh: 12, bk: 0, rw: 0 });
  shape(() => sp(earN), { fill: SC.fur, ow: 10, sh: 22, bk: 9, rw: 8 });
  shape(() => sp([[100, -215], [126, -290], [166, -374, 1], [190, -300], [187, -215]]), { fill: SC.ear, ow: 5, sh: 14, bk: 0, rw: 0 });
  // skull
  const HP = [[40, -238], [8, -266, 1], [-18, -234], [-70, -222], [-150, -170], [-200, -100], [-228, -40], [-262, 5], [-300, 40], [-323, 72], [-318, 104], [-290, 128], [-250, 150], [-190, 178], [-110, 208], [-40, 226], [0, 252, 1], [24, 212], [66, 258, 1], [92, 208], [140, 242, 1], [160, 186], [214, 198, 1], [205, 130], [256, 126, 1], [234, 62], [268, 34, 1], [240, -30], [262, -74, 1], [212, -122], [152, -196], [104, -244, 1], [74, -228]];
  const head = () => sp(HP);
  shape(head, { fill: SC.fur, ow: 11, sh: 44, bk: 16, rw: 10, cell: 12 });
  inside(head, () => {
    g.fillStyle = SC.white; g.beginPath(); sp([[-250, -22], [-205, 22], [-150, 58], [-90, 84], [-30, 102], [40, 114], [110, 106], [170, 120], [260, 90], [270, 320], [-360, 320], [-360, 0]]); g.fill();
    g.fillStyle = HT(LT.ht, 12, .33); g.beginPath(); sp([[-360, 60], [-250, 150], [-120, 200], [40, 230], [60, 330], [-360, 330]]); g.fill();
    g.fillStyle = INK; g.beginPath(); sp([[-200, 176], [-110, 210], [-20, 228], [20, 330], [-260, 330]]); g.fill();
    g.fillStyle = shade(SC.fur, .8); g.beginPath(); sp([[-170, -260], [-150, -150], [-60, -132], [40, -150], [130, -128], [215, -150], [260, -260]]); g.fill();
    const r = rng(31); // fur ticks flowing back from the muzzle
    g.fillStyle = HT(LT.ht, 12, .3); g.beginPath(); sp([[120, 60], [230, -40], [250, 120], [170, 200], [100, 130]]); sp([[-40, -140], [60, -160], [130, -120], [110, -84], [30, -100], [-30, -90]]); sp([[-215, -110], [-130, -130], [-126, -92], [-200, -78]]); g.fill();
    for (let i = 0; i < 130; i++) { const x = -210 + r() * 460, y = -230 + r() * 440, a = Math.atan2(y - 60, x + 300) + (r() - .5) * .5, l = 18 + r() * 30; if (Math.hypot(x - 40, y + 15) < 84 || Math.hypot(x + 168, y + 32) < 62) continue; stroke([[x, y], [x + Math.cos(a) * l, y + Math.sin(a) * l]], 3.5 + r() * 3, y > 95 ? '#bcc2d6' : (i % 3 ? SC.furD : '#4f4e60'), 2); }
    stroke([[-118, -70], [-190, 0], [-268, 46]], 7, SC.furD); stroke([[150, -180], [215, -90], [226, 20]], 12, SC.furD);
  });
  // nose, mouth, whiskers
  shape(() => sp([[-330, 60], [-300, 54], [-292, 78], [-316, 96, 1]]), { fill: SC.nose, ow: 6, sh: 8, bk: 0, rw: 3 });
  if (p.teeth > .2) { shape(() => sp([[-300, 116, 1], [-232, 138], [-196, 132, 1], [-200, 150], [-240, 158], [-292, 140]]), { fill: '#fff', ow: 5, flat: 1 }); for (const x of [-276, -252, -228, -208]) stroke([[x, 126 + (x + 300) * .1], [x + 2, 148]], 3); }
  stroke([[-314, 98], [-286, 124], [-232, 138], [-186, 126]], 7); stroke([[-270, 168], [-230, 176]], 5);
  for (const [a, b, c] of [[[-262, 96], [-340, 60], [-440, 62]], [[-258, 110], [-350, 112], [-446, 140]], [[-250, 124], [-330, 160], [-410, 210]]]) { stroke([a, b, c], 5, INK, 2); stroke([[a[0], a[1] - 2], [b[0], b[1] - 3], [c[0], c[1] - 3]], 2.2, '#fff', 2); }
  for (const pt of [[-262, 96], [-258, 110], [-250, 124], [-236, 100], [-228, 116]]) { g.fillStyle = INK; g.beginPath(); g.arc(pt[0], pt[1], 3.2, 0, TAU); g.fill(); }
  // eyes
  const gl = p.glow, eye = (ex, ey, rx, ry, rot, inner) => {
    g.fillStyle = SC.furL; g.beginPath(); sp(ell(ex, ey, rx + 12, ry + 12, rot, 12)); g.fill();
    const lid = clamp(p.brow) * .38 + p.blink, ly = ey - ry + ry * 2 * lid, sl = p.brow * ry * .3 * inner;
    const ep = ell(ex, ey, rx, ry, rot, 12);
    g.save(); g.beginPath(); poly([[ex - rx - 30, ly + sl], [ex + rx + 30, ly - sl], [ex + rx + 30, ey + ry + 40], [ex - rx - 30, ey + ry + 40]]); g.clip();
    shape(() => sp(ep), { fill: SC.eye, ow: 7, flat: 1 });
    inside(() => sp(ep), () => {
      g.fillStyle = '#2b2236'; g.beginPath(); sp(ell(ex, ey + ry * .5, rx * .8, ry * .45, 0)); g.fill();
      if (gl > 0) { const gr = g.createRadialGradient(ex, ey, 0, ex, ey, ry); gr.addColorStop(0, '#fff'); gr.addColorStop(.45, '#aef2ff'); gr.addColorStop(1, '#1487ff'); g.globalAlpha = clamp(gl * 1.4); g.fillStyle = gr; g.fillRect(ex - rx - 5, ey - ry - 5, rx * 2 + 10, ry * 2 + 10); g.globalAlpha = 1; }
      if (gl < .6) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex - rx * .3, ey - ry * .38, rx * .26, ry * .22, -.4, 0, TAU); g.fill(); g.beginPath(); g.arc(ex + rx * .3, ey + ry * .3, rx * .1, 0, TAU); g.fill(); g.fillStyle = '#9a6bd8'; g.globalAlpha = .7; g.beginPath(); g.ellipse(ex - rx * .5, ey + ry * .1, rx * .18, ry * .4, .2, 0, TAU); g.fill(); g.globalAlpha = 1; }
    });
    g.restore();
    stroke([[ex - rx - 16, ly + sl + 3], [ex, ly - ry * .06], [ex + rx + 16, ly - sl + 3]], 11);
  };
  eye(-168, -32, 30, 52, .06, -1); eye(40, -15, 58, 66, -.05, -1);
  const b = p.brow;
  stroke([[-28, -96 + 26 * b], [42, -104 + 4 * b], [112, -90 - 12 * b]], 17); stroke([[-128, -90 + 22 * b], [-170, -102 + 4 * b], [-208, -92 - 8 * b]], 13);
  // azure veins + eye flare
  if (p.veins > 0 || gl > 0) {
    inside(head, () => {
      const lim = p.veins * 250; g.lineCap = 'round'; g.globalCompositeOperation = 'lighter';
      for (const pass of [0, 1]) { g.strokeStyle = pass ? '#c9f6ff' : 'rgba(20,130,255,.3)'; for (const v of VEINS) { if (v[4] > lim) continue; g.lineWidth = pass ? v[5] * .5 + .8 : v[5] * 1.7 + 3; g.beginPath(); g.moveTo(v[0], v[1]); g.lineTo(v[2], v[3]); g.stroke(); } }
      g.globalCompositeOperation = 'source-over';
    });
    for (const [ex, ey, r] of [[40, -15, 150], [-168, -32, 105]]) {
      glow(ex, ey, r * (1 + .1 * Math.sin(f * 2.1)), 'rgba(30,120,255,.55)', gl); glow(ex, ey, r * .42, 'rgba(170,235,255,.7)', gl);
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = gl * .6; g.translate(ex, ey); g.scale(1, .03); const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 2.6); gr.addColorStop(0, '#bff3ff'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(-r * 3, -r * 3, r * 6, r * 6); g.restore();
    }
  }
  g.restore();
  // raised hands + flames
  const up = p.hands, hy = (1 - eOut(up)) * 620;
  if (up > 0) {
    flame(700, 830 + hy, 180, 300, f, 3, p.flame); paw(712, 905 + hy, .76, .14);
    flame(330, 740 + hy, 250, 430, f, 11, p.flame); paw(345, 835 + hy, 1.05, -.2);
  }
  JIT = 0;
}
