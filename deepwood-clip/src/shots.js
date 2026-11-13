/* ============ SHOTS ============ */
const S1 = { MX: 150, MY: 90 }, S2 = {}, S3 = {}, S4 = {}, TMP = mk(W, H);
const MOON = { x: .55, y: -.83, col: '#dbe6ff', k: 1 };
function lights(arr) { LT.lights = arr; }
function shakeV(f, amp) { return [(hash(f, 11) - .5) * 2 * amp, (hash(f, 12) - .5) * 2 * amp]; }
function setB(sh, z = 1.03) { g.setTransform(z, 0, 0, z, W / 2 * (1 - z) + sh[0], H / 2 * (1 - z) + sh[1]); }
/* draw fn() as a flat single-colour silhouette */
function silh(fn, col) {
  const pg = g, x = TMP.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, W, H);
  x.setTransform(pg.getTransform()); g = x; fn(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';
  g = pg; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(TMP, 0, 0); g.restore();
}
function dustPuffs(x, y, n, f, spread, size, col = '#5a6da6') {
  for (let i = 0; i < n; i++) { const k = ((f * .11 + i / n) % 1), px = x - k * spread * (.5 + hash(i, 3)), py = y - k * size * 1.2 * hash(i, 4) - size * .2, r = size * (.35 + k * .8) * (1 - k * .55); shape(() => sp(ell(px, py, r, r * .78, i, 8)), { fill: col, ow: Math.max(1.5, size * .09), sh: r * .3, bk: 0, rw: r * .12 }); }
}

function buildScenes() {
  const { MX, MY } = S1, LW = W + 2 * MX, LH = H + 2 * MY;
  lights([MOON]);
  const mkL = fn => layer(LW, LH, () => { g.translate(MX, MY); fn(); });
  /* ---------- shot 1: extreme wide, low angle ---------- */
  S1.bg = mkL(() => {
    g.save(); g.translate(-MX, -MY); sky(LW, LH, 1610 + MX, 150 + MY, 66); g.restore();
    canopy(-MX, W + MX, -MY, 300, 11, '#04081a', 520);
    for (const [x, w, sd] of [[-90, 210, 1], [215, 150, 2], [455, 240, 3], [745, 170, 4], [1000, 215, 5], [1275, 160, 6], [1545, 240, 7], [1830, 185, 8], [2040, 200, 9]]) trunk(x, w, 890, -MY - 30, TIER.far, { seed: sd, lean: (960 - x) * .22, moss: 0 });
    mist(960, 880, 1500, 280, '#6f89c8', .9);
    ray(1500, 150, 760, 520, -MY, 960, .75); ray(1700, 90, 1250, 300, -MY, 960, .6); ray(1320, 70, 420, 300, -MY, 940, .45);
    for (const [x, w, sd] of [[80, 300, 21], [660, 290, 22], [1235, 250, 24], [1790, 330, 23]]) trunk(x, w, 925, -MY - 30, TIER.far2, { seed: sd, lean: (960 - x) * .24, moss: 1 });
    mist(900, 950, 1500, 190, '#7d96d2', .85); mist(-80, 800, 620, 380, PAL.vio, .4);
  });
  S1.mid = mkL(() => {
    trunk(395, 400, 965, -MY - 30, TIER.mid, { seed: 31, lean: 150 }); trunk(1500, 440, 968, -MY - 30, TIER.mid, { seed: 32, lean: -140 });
    rootTube([[820, 1010], [1010, 840], [1300, 790], [1660, 880], [1850, 1040]], 80, 56, TIER.mid, { seed: 6, moss: 1 });
    mist(960, 985, 1400, 150, '#6e88c6', .7); mist(960, 900, 700, 330, '#8fa8e6', .55);
  });
  S1.main = mkL(() => {
    trunk(-230, 780, 1030, -MY - 30, TIER.near, { seed: 41, lean: 190, flare: .5 }); trunk(2160, 740, 1030, -MY - 30, TIER.near, { seed: 42, lean: -190, flare: .5 });
    rootTube([[205, 1060], [320, 800], [640, 575], [1010, 505], [1385, 590], [1610, 830], [1700, 1070]], 200, 150, TIER.near, { seed: 3, moss: 1, lines: 18, n: 34, sh: 50, bk: 22, rw: 10 });
    ray(1180, 200, 620, 700, 420, 960, .22);
    groundBand(-MX, W + MX, x => 944 + n1(x * .004) * 12, LH - MY, TIER.near, { seed: 4, rw: 6 });
  });
  S1.fg = mkL(() => {
    rootTube([[-260, 960], [120, 1010], [520, 1100], [800, 1200]], 130, 100, { fill: '#020309', hi: '#1e2c56', ow: 0, htc: '#000' }, { seed: 8, rw: 7, lines: 6 });
    fern(170, 1130, 1.5, 3, '#020309', '#1c2a52'); broadleaf(1740, 1150, 1.7, 5, '#020309', '#1c2a52'); fern(2010, 1120, 1.2, 7, '#020309', '#1c2a52');
  });
  /* ---------- shot 2: side tracking strips ---------- */
  S2.sky = layer(W, H, () => { sky(W, H, 1700, 60, 0); glow(1700, 40, 900, 'rgba(90,120,220,.5)'); canopy(0, W, 0, 170, 13, '#04081a', 260); });
  S2.far = layer(3700, H, () => {
    for (let i = 0; i < 13; i++) trunk(120 + i * 295 + hash(i, 1) * 90, 150 + hash(i, 2) * 120, 830, -30, TIER.far, { seed: 50 + i, moss: 0, lean: (hash(i, 3) - .5) * 60 });
    mist(1850, 840, 2600, 260, '#6f89c8', .9);
    for (let i = 0; i < 4; i++) ray(900 + i * 880, 150, 380 + i * 880, 430, 0, 900, .5);
    for (let i = 0; i < 6; i++) trunk(330 + i * 640 + hash(i, 4) * 120, 250 + hash(i, 5) * 90, 862, -30, TIER.far2, { seed: 70 + i, moss: 1, lean: (hash(i, 6) - .5) * 70 });
    mist(1850, 900, 2600, 170, '#7d96d2', .8);
  });
  S2.mid = layer(5200, H, () => {
    for (let i = 0; i < 7; i++) {
      const x = 260 + i * 790 + hash(i, 7) * 130;
      if (i % 2) rootTube([[x - 620, 960], [x - 520, 720], [x - 300, 610], [x - 60, 700], [20 + x, 960]], 110, 80, TIER.mid, { seed: 90 + i, moss: 1, lines: 12 });
      trunk(x, 350 + hash(i, 8) * 130, 905, -40, TIER.mid, { seed: 80 + i, lean: (hash(i, 9) - .5) * 80 });
    }
    groundBand(0, 5200, x => 878 + n1(x * .005) * 8, H, TIER.mid, { seed: 14 });
    mist(2600, 900, 3400, 110, '#6e88c6', .6);
  });
  const NT = { fill: '#0e1530', hi: '#9ab4ee', ow: 9, bark: 1, htc: '#04060f' };
  S2.trunkA = layer(1700, 1200, () => trunk(850, 760, 1140, -40, NT, { seed: 141, flare: .46 }));
  S2.trunkB = layer(1500, 1200, () => trunk(750, 600, 1140, -40, NT, { seed: 142, flare: .5 }));
  S2.ground = layer(W, 260, () => groundBand(-80, W + 80, x => 44 + 9 * Math.sin(x / W * TAU * 2) + 5 * Math.sin(x / W * TAU * 5), 260, TIER.near, { seed: 9, rw: 6 }));
  S2.fgA = layer(1100, 760, () => { fern(380, 760, 1.5, 21, '#020309', '#1c2a52'); broadleaf(760, 780, 1.6, 22, '#020309', '#1c2a52'); });
  S2.fgB = layer(1900, 1200, () => rootTube([[60, 1250], [260, 620], [700, 260], [1250, 300], [1640, 700], [1840, 1250]], 250, 210, { fill: '#020309', hi: '#1e2c56', ow: 0, htc: '#000' }, { seed: 18, rw: 9, lines: 10, moss: 0 }));
  /* ---------- shot 3: the wall of roots ---------- */
  S3.bg = layer(2500, 1400, () => {
    sky(2500, 1400, 2010, 190, 64); canopy(0, 2500, 0, 300, 15, '#04081a', 520);
    for (let i = 0; i < 9; i++) { const x = 60 + i * 300 + hash(i, 21) * 80; trunk(x, 170 + hash(i, 22) * 100, 1010, -40, TIER.far, { seed: 110 + i, moss: 0, lean: (1250 - x) * .2 }); }
    mist(1250, 1000, 1900, 320, '#6f89c8', .9); ray(1900, 170, 1050, 600, 0, 1080, .55); ray(2150, 100, 1640, 320, 0, 1080, .4);
    for (const [x, w, sd] of [[250, 330, 1], [1010, 300, 2], [1560, 280, 3]]) trunk(x, w, 1045, -40, TIER.far2, { seed: 120 + sd, lean: (1250 - x) * .22, moss: 1 });
    mist(1250, 1070, 1900, 200, '#7d96d2', .8);
  });
  S3.main = layer(2500, 1400, () => {
    trunk(330, 640, 1085, -40, TIER.mid, { seed: 131, lean: 150 });
    g.fillStyle = '#04060f'; g.beginPath(); sp([[1900, -20], [1840, 500], [1800, 1100], [2520, 1100], [2520, -20]]); g.fill();
    const r = rng(12);
    for (let i = 0; i < 10; i++) {
      const x0 = 1780 + i * 80 + r() * 50, T = i % 3 == 1 ? TIER.near : TIER.mid, ctrl = [];
      for (let j = 0; j <= 5; j++) ctrl.push([x0 + (r() - .5) * 230 + j * 26, 1170 - j * 265]);
      rootTube(ctrl, 150 + r() * 110, 130 + r() * 110, T, { seed: i + 30, lines: 14, moss: i % 2, sh: 40, bk: 18, rw: 8 });
    }
    rootTube([[1500, 1150], [1660, 990], [1800, 720], [1890, 380], [2060, -40]], 110, 260, TIER.near, { seed: 44, moss: 1, lines: 16, sh: 46, bk: 20, rw: 9 });
    rootTube([[1690, 1130], [1930, 900], [2200, 850], [2520, 930]], 120, 150, TIER.mid, { seed: 45, moss: 1, lines: 12 });
    groundBand(0, 2500, x => 1062 + n1(x * .004) * 9, 1400, TIER.near, { seed: 24, rw: 6 });
  });
  S3.fg = layer(2500, 1400, () => { fern(260, 1420, 1.7, 33, '#020309', '#1c2a52'); broadleaf(2300, 1430, 1.8, 35, '#020309', '#1c2a52'); });
  /* ---------- shot 4: out-of-focus backdrop ---------- */
  S4.bg = layer(W, H, () => {
    sky(W, H, 0, 0, 0);
    if ('filter' in g) g.filter = 'blur(9px)';
    for (const [x, w, sd, T] of [[250, 420, 1, TIER.far], [900, 360, 2, TIER.far], [1500, 520, 3, TIER.far2], [1960, 400, 4, TIER.far]]) trunk(x, w, 1300, -60, T, { seed: 150 + sd, moss: 0 });
    if ('filter' in g) g.filter = 'none';
    mist(1500, 700, 1200, 700, '#5f79b8', .7); ray(1500, 260, 700, 760, 0, H, .55); ray(1840, 120, 1380, 420, 0, H, .4);
    mist(0, 480, 1100, 800, PAL.vio, .75);
    dots(0, 0, 1100, H, 22, (x, y) => clamp(.8 - x / 1100) * .9, 'rgba(190,120,255,.5)');
    dots(900, 0, W, H, 22, (x, y) => clamp((x - 900) / 1400 - y / 1900) * .7, 'rgba(160,190,255,.35)');
  });
  S2.shards = []; const r = rng(61);
  for (let i = 0; i < 30; i++) S2.shards.push({ vx: 150 + r() * 1700, vy: -1100 + r() * 1300, rot: (r() - .5) * 14, sz: 26 + r() * r() * 150, a: r() * TAU, big: i > 26 });
  buildVeins();
}

/* ================= SHOT 1 (0-3s) ================= */
function shot1(t, tc, fx) {
  const u = t / 3, f = Math.floor(t * 24), z = 1.0 + .15 * smooth(u);
  const L = d => { const zz = 1 + (z - 1) * d; g.setTransform(zz, 0, 0, zz, W / 2 - (W / 2 + 60 * u * d) * zz, H * .78 - (H * .78 - 34 * u * d) * zz); };
  lights([{ ...MOON, k: 2.6 }]);
  L(.35); g.drawImage(S1.bg, -S1.MX, -S1.MY); liveMist(t, 900, '#5f79b8', .35, 4, 26, 1);
  L(.65); g.drawImage(S1.mid, -S1.MX, -S1.MY); liveMist(t, 960, '#6f89c8', .3, 4, 40, 2);
  L(1); g.drawImage(S1.main, -S1.MX, -S1.MY);
  const sx = lerp(385, 1470, tc / 3), gy = 948 + n1(sx * .004) * 12;
  glow(sx + 20, gy - 60, 240, 'rgba(130,160,240,.5)');
  for (let i = 0; i < 4; i++) stroke([[sx - 60 - i * 34, gy - 22 - i * 13 - hash(i, f >> 1) * 20], [sx - 190 - i * 50 - hash(i, (f >> 1) + 5) * 90, gy - 22 - i * 13]], 3.2, i % 2 ? '#cfe0ff' : INK, 2);
  dustPuffs(sx - 26, gy, 4, f >> 1, 110, 13);
  silas(sx, gy, .27, 1, poseRun(tc * 2.3), tc, { ow: 8, jit: 3 });
  g.setTransform(1, 0, 0, 1, 0, 0); motes(t, 46, '#cfe0ff', 3, 10);
  L(1.9); g.drawImage(S1.fg, -S1.MX, -S1.MY);
  fx.mis = 2;
}

/* ================= SHOT 2 (3-6s) ================= */
function drawTrunkA(tx, u, hit) {
  const img = S2.trunkA, ox = tx - 850, oy = -255;
  if (u < hit) { g.drawImage(img, ox, oy); return; }
  const d = u - hit, zig = (y0, amp, sd) => { const p = []; for (let i = 0; i <= 14; i++) p.push([tx - 750 + i * 107, y0 + (i % 2 ? -1.3 : .7) * amp * (.4 + hash(i, sd))]); return p; };
  const edge = zz => { g.lineJoin = 'miter'; g.strokeStyle = INK; g.lineWidth = 12; g.beginPath(); zz.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); g.strokeStyle = '#c9d6f5'; g.lineWidth = 4; g.stroke(); };
  const zs = zig(735, 110, 1); g.save(); g.beginPath(); poly([...zs, [tx + 900, 1200], [tx - 900, 1200]]); g.clip(); g.drawImage(img, ox, oy); edge(zs); g.restore();
  const zt = zig(170, 90, 2).map(p => [p[0], p[1] + (p[1] - 170) * -2 + 0]);
  g.save(); g.translate(tx, 0); g.rotate(-.1 * d); g.translate(-tx, 520 * d * d); g.beginPath(); poly([...zt, [tx + 900, -900], [tx - 900, -900]]); g.clip(); g.drawImage(img, ox, oy); edge(zt); g.restore();
}
function shards(cx, cy, d, tcd, front) {
  for (const [i, s] of S2.shards.entries()) {
    if (!!s.big != !!front) continue;
    const k = front ? 2.2 : 1, x = cx + s.vx * d * k, y = cy + s.vy * d * k + 1500 * d * d, a = s.a + s.rot * tcd, sz = s.sz * k, c = Math.cos(a), sn = Math.sin(a);
    const q = (px, py) => [x + px * c - py * sn, y + px * sn + py * c, 1], pts = [q(-sz, -sz * .16), q(sz * .2, -sz * .26), q(sz, 0), q(sz * .1, sz * .22), q(-sz * .7, sz * .12)];
    shape(() => sp(pts), { fill: front ? '#020309' : (i % 4 ? '#131c3a' : '#8fa3d6'), ow: 4 + sz * .03, sh: sz * .1, bk: 0, rw: sz * .03 });
  }
}
function crPoseRun(tc) {
  const gp = tc * TAU * 1.9, s = Math.sin(gp);
  return { rear: -.05 + .07 * s, head: -.06 + .1 * Math.sin(gp + 1), jaw: .55 + .35 * Math.sin(gp * 2), aN: -.1 + .75 * s, eN: .55 - .35 * s, aF: -.1 - .75 * s, eF: .55 + .35 * s, hind: Math.sin(gp + 2), glow: 1 };
}
function shot2(t, tc, fx) {
  const u = t - 3, uc = tc - 3, f = Math.floor(t * 24), camX = 1350 * u, hit = 1.9, kf = Math.floor((u - hit) * 24 + 1e-6), d = u - hit, dc = Math.max(0, uc - hit);
  const gp = tc * TAU * 1.9;
  const amp = u > hit ? 30 * Math.exp(-d * 4) + 9 * Math.pow(Math.max(0, Math.sin(gp)), 6) : (u > .8 ? 1.5 + 2 * seg(u, .8, hit) : 0);
  const sh = shakeV(f, amp), sx = 1215 + 60 * Math.sin(u * .9), gy = 902;
  const tx = 2985 - camX, crx = lerp(-330, 30, eOut(seg(d, 0, .3))) + 50 * seg(d, .3, 1.1), cry = 908;
  const drawSilas = () => { const p = poseRun(tc * 2.25); if (u > hit) { p.brow = -.4; } silas(sx, gy, 1.04, 1, p, tc); };
  lights([MOON, { x: -.98, y: -.2, col: PAL.vio, k: u > hit ? 1.5 : .9 * seg(u, .8, 1.5) }]);
  if (u >= hit && kf < 2) { // ---- impact frames
    setB(shakeV(f, 22), 1.06); const cx = 430, cy = 470;
    g.fillStyle = kf ? INK : '#fff'; g.fillRect(-100, -100, W + 200, H + 200);
    burst(cx, cy, kf ? 170 : 260, 2600, kf ? 44 : 30, kf ? PAL.vioL : INK, f, kf ? 44 : 70);
    silh(() => { drawTrunkA(tx, hit + .02, hit); shards(cx, cy, .03 + kf * .03, 0, 0); creature(crx - 40, cry, 1.25, { ...crPoseRun(tc), jaw: 1, glow: 0 }, tc); drawSilas(); g.drawImage(S2.ground, -(camX % W), 858); g.drawImage(S2.ground, W - (camX % W), 858); }, kf ? '#fff' : INK);
    setB(shakeV(f, 22), 1.06);
    if (kf) { g.strokeStyle = '#fff'; g.lineWidth = 14; g.beginPath(); g.arc(cx, cy, 300, 0, TAU); g.stroke(); }
    else { glow(cx - 60, cy - 250, 260, 'rgba(160,60,255,1)'); g.fillStyle = PAL.vio; g.beginPath(); sp(leafPts(cx - 150, cy - 240, 150, 30, .3)); sp(leafPts(cx + 10, cy - 200, 90, 18, .4)); g.fill(); }
    fx.mis = 18; return;
  }
  setB(sh); g.drawImage(S2.sky, 0, 0);
  g.drawImage(S2.far, -camX * .1 - 40, 0);
  g.drawImage(S2.mid, -camX * .38 - 160, 0);
  // the thing in the mist
  const eg = seg(u, .8, hit);
  if (u > .8) mist(180 + 60 * eg, 420, 500 + 500 * eg, 420 + 240 * eg, PAL.vio, .25 + .5 * eg);
  if (u > .8 && u < hit) {
    const on = u > .98 || (Math.floor(uc * 12) % 2 == 0), s = lerp(.55, 1.3, eg), ex = 215 + 70 * eg + Math.sin(gp) * 8, ey = 300 - 30 * eg + Math.abs(Math.sin(gp)) * 22;
    g.fillStyle = 'rgba(4,4,14,' + (.5 * eg) + ')'; g.beginPath(); sp([[ex - 420 * s, 900], [ex - 380 * s, ey - 60 * s], [ex - 200 * s, ey - 240 * s], [ex + 40 * s, ey - 200 * s], [ex + 260 * s, ey - 40 * s], [ex + 330 * s, ey + 120 * s], [ex + 200 * s, ey + 260 * s], [ex + 240 * s, 900]]); g.fill();
    if (on) for (const [ox, oy, l, a] of [[-95, 0, 104, .28], [42, 22, 74, .34]]) {
      glow(ex + ox * s + l * s * .4, ey + oy * s + 8, l * s * 2.8, 'rgba(160,60,255,.9)'); glow(ex + ox * s + l * s * .4, ey + oy * s + 8, l * s, 'rgba(240,210,255,.9)');
      g.fillStyle = '#f6e6ff'; g.beginPath(); sp(leafPts(ex + ox * s, ey + oy * s, l * s, l * s * .2, a)); g.fill();
      stroke([[ex + ox * s + 10, ey + oy * s - 4], [ex + ox * s - 70 * s, ey + oy * s - 50 * s], [ex + ox * s - 170 * s, ey + oy * s - 60 * s - (f % 4) * 6]], 7 * s, PAL.vioL, 2);
    }
  }
  liveMist(t, 880, '#6f89c8', .3, 5, -500, 3);
  g.drawImage(S2.trunkB, 380 - camX - 750, -255); drawTrunkA(tx, u, hit);
  for (const o of [0, 26]) { g.globalAlpha = o ? .45 : 1; g.drawImage(S2.ground, -((camX + o) % W), 858); g.drawImage(S2.ground, W - ((camX + o) % W), 858); } g.globalAlpha = 1;
  if (u >= hit) {
    const cx = 430 - 500 * d;
    for (let i = 0; i < 7; i++) { const k = clamp(d * 1.5), r = (90 + hash(i, 2) * 120) * (.4 + k) * (1 - k * .75), px = cx + (hash(i, 3) - .5) * 500 + 200 * k, py = 520 + (hash(i, 4) - .5) * 520 - 100 * k; if (r > 6) shape(() => sp(ell(px, py, r, r * .8, i, 9)), { fill: '#3d5088', ow: 7, sh: r * .3, bk: 0, rw: r * .1 }); }
    creature(crx, cry + Math.abs(Math.sin(gp)) * -26, 1.25, crPoseRun(tc), tc);
    shards(430 - 200 * d, 470, dc + .04, dc, 0);
    dustPuffs(crx + 420, 905, 5, f >> 1, 420, 60, '#3d5088');
  }
  dustPuffs(sx - 70, gy + 4, 4, f >> 1, 330, 34);
  drawSilas();
  speedLines(f >> 1, u > hit ? 16 : 10, '#dbe6ff', { w: 6, len: 1000 }); speedLines((f >> 1) + 40, u > hit ? 12 : 7, INK, { w: 8, len: 1100 });
  for (const [img, X0, y, n] of [[S2.fgA, 2500, 400, 5], [S2.fgA, 8300, 430, 5]]) { const x = X0 - camX * 2.3 - img.width / 2; if (x > -img.width - 300 && x < W + 100) for (let i = n - 1; i >= 0; i--) { g.globalAlpha = i ? .3 : 1; g.drawImage(img, x + i * 34, y); } g.globalAlpha = 1; }
  if (u >= hit) { shards(430, 470, dc + .04, dc, 1); const k = seg(d, 2 / 24, .7); if (k > 0 && k < 1) sfx('KRAKK!', 800 + 40 * k, 190 - 20 * k, 150 * (1.25 - .25 * eOut(seg(k, 0, .25))), { rot: -.13, col: '#fff', col2: PAL.vio, seed: 3 + (f >> 1) % 2, grow: .05 }); }
  fx.mis = 2 + (u > hit ? 14 * Math.exp(-d * 6) : 0);
}

/* ================= SHOT 3 (6-9s) ================= */
function shot3(t, tc, fx) {
  const u = t - 6, uc = tc - 6, f = Math.floor(t * 24), f2 = f >> 1, gyW = 1064;
  // Silas: sprint in, skid, spin to face LEFT
  const sxAt = v => v < .4 ? 1040 + v / .4 * 340 : 1380 + 190 * eOut(seg(v, .4, .9));
  const sx = sxAt(uc), roar = seg(u, 2.0, 2.12), rt = Math.max(0, u - 2.0);
  let P, face = 1;
  if (uc < .4) P = poseRun(tc * 2.25);
  else if (uc < .9) P = mixPose(poseRun(.3), POSE.skid, eOut(seg(uc, .4, .55)));
  else if (uc < 1.02) { P = { ...POSE.skid, sx: .45 }; }
  else if (uc < 1.1) { P = { ...POSE.ready, sx: .55 }; face = -1; }
  else { face = -1; P = mixPose(POSE.ready, POSE.brace, eOut(seg(uc, 1.98, 2.2))); if (uc > 1.3 && uc < 2) { P.brow = -.5; P.lean = .22 - .12 * seg(uc, 1.3, 1.9); P.head = -.42 - .2 * seg(uc, 1.3, 1.9); } if (uc >= 2) { P.cloakA += Math.sin(tc * 30) * .05; } }
  // creature: stalks in from the left, rears, roars
  const cin = eOut(seg(uc, 1.05, 1.85)), crx = lerp(-700, 590, cin), step = Math.sin(uc * TAU * 2.2);
  const rear = -.2 * eIO(seg(uc, 1.5, 1.98)) + .1 * eOut(seg(uc, 2.0, 2.15)), CP = {
    rear, head: lerp(-.1, -.5, seg(uc, 1.5, 1.95)) + .98 * eOut(seg(uc, 1.98, 2.12)) + (uc > 2 ? Math.sin(tc * 40) * .03 : 0), jaw: uc < 1.98 ? .12 + .1 * seg(uc, 1.5, 1.9) : 1,
    aN: uc < 1.85 ? -.15 + .6 * step * (1 - cin * .6) : lerp(-.2, .38, eOut(seg(uc, 1.85, 2.1))), eN: uc < 1.85 ? .55 - .3 * step : lerp(.55, .28, eOut(seg(uc, 1.85, 2.1))),
    aF: uc < 1.85 ? -.15 - .6 * step : lerp(-.2, .75, eOut(seg(uc, 1.85, 2.1))), eF: uc < 1.85 ? .55 + .3 * step : lerp(.55, .75, eOut(seg(uc, 1.85, 2.1))), hind: uc < 1.85 ? step : 0, glow: 1
  };
  const cs = 1.1, cr_ = Math.cos(rear), sr = Math.sin(rear), hpx = -640 + 810 * cr_ + 410 * sr, hpy = -150 + 810 * sr - 410 * cr_, ha = rear + CP.head;
  const mouth = [crx + (hpx + 300 * Math.cos(ha) - 108 * Math.sin(ha)) * cs, gyW + (hpy + 300 * Math.sin(ha) + 108 * Math.cos(ha)) * cs];
  // camera: tight on Silas, then pulls back low and wide as the beast arrives
  const pull = eIO(seg(u, .95, 1.75)), z = lerp(1.42, 1.0, pull) + .05 * eOut(roar) + .02 * rt;
  const cx = lerp(sxAt(u) + 70, 1170, pull), cy = lerp(850, 650, pull);
  let amp = 0; for (const th of [1.12, 1.42, 1.7]) amp += 16 * Math.exp(-Math.max(0, u - th) * 7) * (u > th ? 1 : 0);
  amp += u > 2 ? 24 * Math.exp(-rt * 2.2) + 7 : 0; if (u > .4 && u < .9) amp += 3;
  const sh = shakeV(f, amp), cam = (px = 0, py = 0) => g.setTransform(z, 0, 0, z, W / 2 - (cx - px) * z + sh[0], H / 2 - (cy - py) * z + sh[1]);
  const vk = .9 * seg(u, .7, 1.8) + 1.9 * roar * (.8 + .2 * hash(f2, 5));
  lights([MOON, { x: -.97, y: -.24, col: PAL.vio, k: vk }]);
  cam((cx - 1250) * .3, (cy - 700) * .3); g.drawImage(S3.bg, 0, 0);
  cam(); mist(260, 760, 900 + 500 * cin, 700, PAL.vio, .3 * seg(u, .5, 1.6) + .3 * roar);
  g.drawImage(S3.main, 0, 0);
  if (roar > 0) { // his shadow thrown huge against the roots
    g.save(); g.translate(sx + 250, gyW + 30); g.transform(2.3, 0, -.25, 2.5, 0, 0); silh(() => silas(0, 0, .8, face, P, tc), 'rgba(2,2,9,.82)'); g.restore(); cam();
  }
  if (uc > 1.05) {
    creature(crx, gyW + 6 + Math.abs(step) * -14 * (1 - cin), cs, CP, tc);
    if (uc < 1.9) dustPuffs(crx + 80, gyW, 5, f2, 360, 54, '#3d5088');
  }
  if (uc >= .4 && uc < 1.25) { dustPuffs(sx + (face > 0 ? 70 : -40), gyW + 2, 6, f2, -260 * (1 - seg(uc, .9, 1.25)), 40 * (1 - seg(uc, .85, 1.25))); for (let i = 0; i < 5; i++) stroke([[sx + 40 - i * 12, gyW - 4 + i * 5], [sx - 150 - i * 50 - hash(i, f2) * 80, gyW - 8 + i * 5]], 5, i % 2 ? '#dbe6ff' : INK, 2); }
  if (uc >= .9 && uc < 1.1) for (let i = 0; i < 7; i++) stroke([[sx - 120, gyW - 60 - i * 38], [sx, gyW - 70 - i * 38 + (hash(i, f2) - .5) * 20], [sx + 120, gyW - 60 - i * 38]], 9, i % 2 ? SC.cloak : SC.furL, 3);
  if (roar > 0) {
    for (let i = 0; i < 15; i++) { const a = -.45 + hash(i, f2 * 3 + 1) * 1.15, r0 = 240 + hash(i, f2 + 2) * 500, r1 = r0 + 200 + hash(i, f2 + 3) * 700; stroke([[mouth[0] + Math.cos(a) * r0, mouth[1] + Math.sin(a) * r0], [mouth[0] + Math.cos(a) * r1, mouth[1] + Math.sin(a) * r1]], 4 + hash(i, f2 + 4) * 9, i % 3 == 0 ? INK : (i % 3 == 1 ? '#fff' : PAL.vioL), 3); }
  }
  silas(sx, gyW, .8, face, P, tc);
  if (roar > 0) { // violet light floods the frame
    g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = .3 * roar * (.85 + .15 * hash(f2, 8));
    const gr = g.createRadialGradient(mouth[0], mouth[1], 40, mouth[0], mouth[1], 1500); gr.addColorStop(0, '#e9c9ff'); gr.addColorStop(.25, PAL.vio); gr.addColorStop(.7, '#2a0c5a'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(-200, -200, 2900, 1800); g.restore();
    g.globalAlpha = .35 * roar; dots(mouth[0] + 100, mouth[1] - 600, mouth[0] + 1300, mouth[1] + 700, 20, (x, y) => clamp(1.05 - Math.hypot(x - mouth[0], y - mouth[1]) / 1150) * .8 * (.6 + .4 * Math.sin(Math.hypot(x - mouth[0], y - mouth[1]) * .02 - rt * 30)), PAL.vioL); g.globalAlpha = 1;
    for (let i = 0; i < 16; i++) { const k = (rt * 1.6 + hash(i, 1)) % 1, px = mouth[0] + 200 + k * 1500, py = mouth[1] - 300 + hash(i, 2) * 900 + k * 200, a = k * 9 + i, s = 10 + hash(i, 3) * 16; g.fillStyle = i % 2 ? INK : '#2a1848'; g.beginPath(); sp(leafPts(px, py, s * 2.4, s * .7, a)); g.fill(); }
  }
  cam((cx - 1170) * -.5, 0); g.drawImage(S3.fg, 0, 0);
  if (roar > 0) { g.setTransform(1, 0, 0, 1, sh[0] * 1.5, sh[1] * 1.5); sfx('RRRAAAHH', 760, 120 + 14 * roar, 118 * (1.3 - .3 * eOut(seg(rt, 0, .15))) * (1 + rt * .06), { rot: -.05, col: PAL.vioL, col2: '#fff', seed: 7 + f2 % 2, grow: .06, sp: .86, arc: 5 }); }
  if (u >= 2 && u < 2 + 1 / 24) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = .75; g.fillStyle = '#f3e4ff'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  fx.mis = 2 + (u > 2 ? 9 * Math.exp(-rt * 5) + 1 : 0);
}

/* ================= SHOT 4 (9-12s) ================= */
function shot4(t, tc, fx) {
  const HOLD = 2.25, still = t - 9 >= HOLD, u = still ? HOLD : t - 9, uc = still ? HOLD : tc - 9, tcc = 9 + uc, f = Math.floor((9 + u) * 24), f2 = f >> 1, BT = 1.75, db = u - BT, kf = Math.floor(db * 24 + 1e-6);
  const fl = u >= BT ? 1 : 0, gl = eOut(seg(uc, .8, .95)), hd = seg(t - 9 - HOLD, 0, .2);
  const p = {
    brow: lerp(-.75, 1, eIO(seg(uc, .45, .85))), blink: (uc > .5 && uc < .62) ? .5 : 0, glow: gl, veins: seg(uc, .85, 1.75) * .8 + .2 * fl * seg(uc, BT, HOLD) + (gl > 0 ? .02 : 0), teeth: uc > 1.0 ? 1 : 0,
    hands: seg(uc, 1.3, 1.7), flame: fl ? 1 + .35 * Math.exp(-Math.max(0, uc - BT) * 6) : 0, tilt: .05 * (1 - eIO(seg(uc, .45, .9)))
  };
  const z = 1.03 + .07 * eIO(u / HOLD) + (fl ? .03 : 0), sh = shakeV(f, still ? 0 : (fl ? 22 * Math.exp(-db * 5) + 1.5 : 2.2 * seg(u, 0, .5) * (1 - gl) + (u > .8 && u < .95 ? 7 : 0)));
  const vk = 1.7 * (.72 + .28 * hash(f2, 5)) * (1 - .5 * fl);
  lights([MOON, { x: -.96, y: -.28, col: PAL.vio, k: vk }, { x: -.72, y: .69, col: '#39b8ff', k: 1.7 * fl + .45 * gl * (1 - fl) }]);
  LT.ht = fl ? '#061a4d' : '#0d1433';
  const pk = still ? lerp(1, .9, eOut(hd)) : 1;
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (still) { g.fillStyle = '#ecebe4'; g.fillRect(0, 0, W, H); }
  const base = () => { g.setTransform(1, 0, 0, 1, 0, 0); if (still) { g.translate(W / 2, H / 2); g.rotate(-.012 * eOut(hd)); g.scale(pk, pk); g.translate(-W / 2, -H / 2); } };
  const cam = () => { base(); g.translate(W / 2 + sh[0], H / 2 + sh[1]); g.scale(z, z); g.translate(-1000, -535); };
  g.save();
  if (still) { base(); g.beginPath(); g.rect(0, 0, W, H); g.clip(); }
  const chars = () => {
    // the creature: a black shape crowding the left edge of frame
    const bx = Math.sin(tcc * 7) * 6, by = Math.sin(tcc * 5) * 8;
    const cp = [[-80, -80], [300, -80], [270, 30], [216, 130, 1], [206, 50], [150, 60], [132, 200, 1], [96, 80], [50, 90], [32, 220, 1], [-10, 110], [-80, 130]].map(q => [q[0] + bx, q[1] + by, q[2]]);
    glow(120 + bx, 20 + by, 520, 'rgba(150,60,255,.7)', .7 + .3 * hash(f2, 2));
    shape(() => sp(cp), { fill: '#030308', ow: 10, sh: 0, bk: 0, rw: 7 });
    const lj = [[-80, 470], [0, 400], [30, 300, 1], [60, 410], [100, 430], [118, 350, 1], [140, 470], [90, 600], [-80, 650]].map(q => [q[0] + bx * .5, q[1] - by, q[2]]);
    shape(() => sp(lj), { fill: '#030308', ow: 10, sh: 0, bk: 0, rw: 7 });
    silasClose(t, tcc, p);
  };
  if (fl && kf < 2 && !still) { // ---- ignition impact frames
    cam(); g.fillStyle = kf ? INK : '#eafaff'; g.fillRect(-300, -300, W + 600, H + 600);
    burst(450, 700, kf ? 190 : 280, 2600, kf ? 46 : 32, kf ? '#39b8ff' : INK, f, kf ? 44 : 70);
    silh(chars, kf ? '#0c46d6' : INK); cam();
    for (const [ex, ey, r] of [[1275, 488, 150], [1042, 469, 100]]) { glow(ex, ey, r * 1.6, 'rgba(60,170,255,1)'); glow(ex, ey, r * .6, '#fff'); }
    flame(700, 830, 180, 300, f, 3, 1.3); flame(330, 740, 250, 430, f, 11, 1.3);
    fx.mis = 18; g.restore(); return;
  }
  cam(); g.save(); g.translate(W / 2, H / 2); g.scale(1.14, 1.14); g.translate(-W / 2, -H / 2); g.drawImage(S4.bg, 0, 0); g.restore();
  mist(120, 300, 900, 700, PAL.vio, .35 * (.7 + .3 * hash(f2, 3)) * (1 - .4 * fl));
  if (fl) { mist(450, 760, 1300, 1000, '#1470ff', .38); }
  chars();
  if (fl) { // azure light washes the scene, pushing back the violet
    cam(); g.save(); g.globalCompositeOperation = 'soft-light'; const gr = g.createRadialGradient(450, 740, 60, 450, 740, 1500); gr.addColorStop(0, '#9fe8ff'); gr.addColorStop(.4, '#1b8dff'); gr.addColorStop(1, 'rgba(10,30,120,0)'); g.fillStyle = gr; g.globalAlpha = .5; g.fillRect(-300, -300, W + 600, H + 600); g.restore();
    g.globalAlpha = .3; dots(-100, 200, 1300, H + 100, 20, (x, y) => clamp(1 - Math.hypot(x - 450, y - 740) / 800) * .7, '#bff1ff'); g.globalAlpha = 1;
    for (let i = 0; i < 26; i++) { const k = ((tcc * .5 + hash(i, 1)) % 1), px = 150 + hash(i, 2) * 800 + Math.sin(k * 7 + i) * 40, py = 900 - k * 1000, s = (1 - k) * (5 + hash(i, 3) * 9); g.fillStyle = i % 3 ? '#7fe0ff' : '#fff'; g.beginPath(); poly([[px, py - s * 1.7], [px + s * .6, py], [px, py + s], [px - s * .6, py]]); g.fill(); }
  } else motes(t, 30, '#b9a0ff', 9, 60);
  if (gl > 0 && u < .8 + 2 / 24) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = .55; g.fillStyle = '#dff6ff'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  g.restore();
  if (still) { // ---- held comic panel
    base(); g.lineJoin = 'miter'; g.strokeStyle = INK; g.lineWidth = 16; g.strokeRect(0, 0, W, H);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (hd < .6) { g.globalAlpha = Math.pow(1 - hd / .6, 2); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  }
  LT.ht = '#0d1433';
  fx.mis = still ? 2.4 : 2 + (fl ? 7 * Math.exp(-db * 9) : 0) + (u > .8 && u < .95 ? 6 : 0); fx.still = still;
}
