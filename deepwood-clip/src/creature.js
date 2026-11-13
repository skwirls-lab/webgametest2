/* ============ THE CREATURE: rat-thing of sinew, bark and corroded black iron ============ */
const CC = { bark: '#262130', barkHi: '#6a6488', sinew: '#5a3050', sinewHi: '#96587e', iron: '#12131c', ironHi: '#8494bd', bone: '#cfc8dc', mouth: '#16041f', rust: '#4a2a2e' };
function seam(pts, w, a) {
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.globalCompositeOperation = 'lighter';
  const draw = () => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); };
  g.globalAlpha = .35 * a; g.strokeStyle = PAL.vio; g.lineWidth = w * 5; draw();
  g.globalAlpha = .9 * a; g.lineWidth = w * 1.8; draw(); g.globalAlpha = a; g.strokeStyle = '#f0dcff'; g.lineWidth = w * .7; draw();
  g.restore();
}
function rivets(pts, col) { g.fillStyle = INK; for (const p of pts) { g.beginPath(); g.arc(p[0], p[1], 9, 0, TAU); g.fill(); } g.fillStyle = col; for (const p of pts) { g.beginPath(); g.arc(p[0] + 2, p[1] - 2, 4.5, 0, TAU); g.fill(); } }
function plate(pts, rv) {
  shape(() => sp(pts.map(p => [p[0], p[1], 1])), { fill: CC.iron, ow: 9, sh: 26, bk: 10, rw: 8, htc: '#000' });
  inside(() => sp(pts.map(p => [p[0], p[1], 1])), () => { const r = rng(pts[0][0] | 0); let cx = 0, cy = 0; pts.forEach(p => { cx += p[0] / pts.length; cy += p[1] / pts.length; }); for (let i = 0; i < 7; i++) { const x = cx + (r() - .5) * 200, y = cy + (r() - .5) * 160; stroke([[x, y], [x + 20 + r() * 50, y + 30 + r() * 60]], 4 + r() * 8, i % 3 ? CC.rust : '#2a2f44'); } });
  if (rv) rivets(rv, CC.ironHi);
}
function creature(x, y, s, P, tc) {
  const pj = JIT, pb = BOIL; JIT = 5; BOIL = Math.floor(tc * 12) * 2.3;
  const f = Math.floor(tc * 12), gl = P.glow ?? 1, pulse = gl * (.8 + .2 * Math.sin(f * 1.9));
  g.save(); g.translate(x, y); g.scale(s, s);
  const O = { ow: 11, sh: 60, bk: 28, rw: 9, cell: 13, htc: '#05030c' };
  const claw = (cx, cy, l, a) => shape(() => sp(leafPts(cx, cy, l, l * .2, a)), { fill: CC.bone, ow: 7, sh: 10, bk: 4, rw: 4 });
  // ---- tail
  const tl = cr([[-860, -220], [-1040, -130], [-1230, -170 + Math.sin(tc * 9) * 40], [-1400, -330 + Math.sin(tc * 9 - 1) * 70], [-1540, -260 + Math.sin(tc * 9 - 2) * 90]], 22), twf = k => lerp(130, 18, Math.pow(k, .8));
  shape(() => sp(tube(tl, twf)), { fill: CC.sinew, ow: 10, sh: 30, bk: 14, rw: 7 });
  for (let i = 2; i < 22; i += 2) { const a = offs(tl, twf, 1)[i], b = offs(tl, twf, -1)[i]; stroke([a, [(a[0] + b[0]) / 2 - 8, (a[1] + b[1]) / 2], b], 6); }
  // ---- far hind leg, near hind leg
  const hind = (ox, oy, k, far) => {
    const col = shade(CC.bark, far ? .55 : 1), hx = -640 + ox, hy2 = -250 + oy, fx = -560 + ox + k * 120, fy = -22 + oy * .2 - Math.max(0, k) * 30;
    shape(() => sp(cap(hx + 40, hy2 + 60, fx - 60, fy - 40, 190, 110)), { ...O, fill: col });
    shape(() => sp(cap(fx - 80, fy - 20, fx + 150, fy + 2, 90, 70)), { ...O, fill: col, sh: 24, bk: 10 });
    if (!far) for (let i = 0; i < 3; i++) claw(fx + 130 + i * 22, fy - 20 + i * 10, 80, .35 + i * .12);
    shape(() => sp(ell(hx, hy2, 195, 215, .3, 12)), { ...O, fill: col });
    if (!far) inside(() => sp(ell(hx, hy2, 195, 215, .3, 12)), () => { for (let i = 0; i < 9; i++) stroke([[hx - 180 + i * 30, hy2 - 150 + i * 14], [hx - 120 + i * 30, hy2 + i * 10], [hx - 150 + i * 34, hy2 + 170]], 5 + (i % 3) * 3, i % 4 == 3 ? CC.barkHi : INK); });
  };
  hind(150, -20, -(P.hind || 0), 1);
  // ---- everything forward of the haunch rears about the hip
  g.save(); g.translate(-640, -150); g.rotate(P.rear); g.translate(640, 150);
  const arm = (S, a, e, far) => {
    const col = shade(CC.bark, far ? .55 : 1), E = [S[0] + 235 * Math.sin(a), S[1] + 235 * Math.cos(a)], b = a + e, Wr = [E[0] + 245 * Math.sin(b), E[1] + 245 * Math.cos(b)], u = [Math.sin(b), Math.cos(b)], n = [u[1], -u[0]];
    const pa = b - Math.PI / 2 + .9; // paw direction
    for (let i = 0; i < 4; i++) { const cx = Wr[0] + Math.cos(pa) * (60 + i * 6) + n[0] * (i - 1.5) * 34, cy = Wr[1] + Math.sin(pa) * (60 + i * 6) + n[1] * (i - 1.5) * 34; if (!far || i < 3) shape(() => sp(leafPts(cx, cy, 120, 24, pa + .25 + (i - 1.5) * .12)), { fill: far ? shade(CC.bone, .5) : CC.bone, ow: 8, sh: 14, bk: 5, rw: 5 }); }
    shape(() => sp(ell(Wr[0] + Math.cos(pa) * 20, Wr[1] + Math.sin(pa) * 20, 105, 72, pa, 10)), { ...O, fill: col, sh: 30, bk: 12 });
    shape(() => sp(cap(E[0], E[1], Wr[0], Wr[1], 170, 120)), { ...O, fill: far ? col : CC.sinew });
    if (!far) { for (let i = 0; i < 5; i++) { const k = .1 + i * .2; stroke([[E[0] + n[0] * 70 * (k - .5), E[1] + n[1] * 70 * (k - .5)], [lerp(E[0], Wr[0], .5) + n[0] * 60 * (k - .5) + 8, lerp(E[1], Wr[1], .5) + n[1] * 60 * (k - .5)], [Wr[0] + n[0] * 50 * (k - .5), Wr[1] + n[1] * 50 * (k - .5)]], 6, i == 1 ? CC.sinewHi : INK); } }
    const b0 = [lerp(E[0], Wr[0], .3), lerp(E[1], Wr[1], .3)], b1 = [lerp(E[0], Wr[0], .78), lerp(E[1], Wr[1], .78)];
    shape(() => sp(cap(b0[0], b0[1], b1[0], b1[1], 178, 146).map(p => [p[0], p[1], 1])), { fill: far ? '#090a10' : CC.iron, ow: 9, sh: 24, bk: 10, rw: 8, htc: '#000' });
    if (!far) { rivets([[b0[0] + n[0] * 60, b0[1] + n[1] * 60], [b0[0] - n[0] * 60, b0[1] - n[1] * 60], [b1[0] + n[0] * 50, b1[1] + n[1] * 50], [b1[0] - n[0] * 50, b1[1] - n[1] * 50]], CC.ironHi); seam([[b0[0] + n[0] * 20, b0[1] + n[1] * 20], [lerp(b0[0], b1[0], .5) - n[0] * 10, lerp(b0[1], b1[1], .5) - n[1] * 10], [b1[0] + n[0] * 16, b1[1] + n[1] * 16]], 5, pulse); }
    shape(() => sp(cap(S[0], S[1], E[0], E[1], 250, 180)), { ...O, fill: col });
    if (!far) inside(() => sp(cap(S[0], S[1], E[0], E[1], 250, 180)), () => { for (let i = 0; i < 7; i++) { const k = (i - 3) * 30; stroke([[S[0] + k, S[1] - 60], [lerp(S[0], E[0], .5) + k * .8 + 12, lerp(S[1], E[1], .5)], [E[0] + k * .6, E[1] + 40]], 5 + (i % 2) * 4, i == 5 ? CC.barkHi : INK); } });
  };
  arm([200, -470], P.aF, P.eF, 1);
  // back spines (splintered bark) + exhaust stacks
  for (const [bx, by, l, a] of [[-770, -490, 150, -2.3], [-650, -570, 200, -2.0], [-210, -800, 280, -1.85], [-70, -800, 200, -1.55], [70, -750, 150, -1.3], [-480, -680, 120, -2.0]]) shape(() => sp(leafPts(bx, by + 30, l, l * .17, a)), { fill: CC.bark, ow: 9, sh: 16, bk: 8, rw: 6 });
  for (const [px, py, l, a, w] of [[-560, -620, 190, -1.95, 62], [-410, -690, 270, -1.8, 80], [-290, -740, 180, -1.62, 56]]) {
    const ex = px + Math.cos(a) * l, ey = py + Math.sin(a) * l;
    for (let i = 0; i < 4; i++) { const k = ((f * .17 + i * .25 + px * .01) % 1), sx = ex + Math.cos(a) * 30 - k * 220 - Math.sin(k * 5 + i) * 30, sy = ey - k * 260, r = 26 + k * 70; g.globalAlpha = (1 - k) * .85; shape(() => sp(ell(sx, sy, r, r * .8, i, 8)), { fill: '#2c1c4a', ow: 5, sh: 0, bk: 0, rw: 6 }); g.globalAlpha = 1; }
    shape(() => sp(cap(px, py + 40, ex, ey, w, w * .9).map(p => [p[0], p[1], 1])), { fill: CC.iron, ow: 9, sh: 16, bk: 7, rw: 7, htc: '#000' });
    shape(() => sp(cap(lerp(px, ex, .78), lerp(py, ey, .78), lerp(px, ex, .9), lerp(py, ey, .9), w * 1.25, w * 1.25).map(p => [p[0], p[1], 1])), { fill: CC.iron, ow: 7, sh: 8, bk: 0, rw: 6 });
    glow(ex, ey, 110, 'rgba(160,70,255,.8)', pulse);
  }
  // ---- body
  const body = [[-860, -60], [-925, -230], [-850, -420], [-670, -560], [-440, -680], [-190, -795], [40, -775], [195, -640], [240, -480], [170, -330], [60, -230], [-140, -150], [-460, -110], [-700, -60]];
  shape(() => sp(body), { ...O, fill: CC.bark, sh: 90, bk: 44 });
  inside(() => sp(body), () => {
    const r = rng(5);
    g.fillStyle = CC.sinew; g.beginPath(); sp([[-700, -260], [-500, -330], [-250, -300], [-60, -330], [80, -260], [-140, -120], [-480, -90], [-720, -80]]); g.fill();
    for (let i = 0; i < 11; i++) { const bx = -640 + i * 62; stroke([[bx, -330 + (i % 2) * 14], [bx - 34, -210], [bx - 20, -100]], 9 + (i % 3) * 3, i % 4 == 1 ? CC.sinewHi : INK); }
    for (let i = 0; i < 46; i++) { const bx = -900 + r() * 1100, by = -720 + r() * 400, l = 60 + r() * 160; stroke([[bx, by], [bx + l * .5, by + 14 + r() * 20], [bx + l, by + (r() - .3) * 50]], 4 + r() * 9, r() < .28 ? CC.barkHi : INK); }
    dots(-940, -480, 220, -40, 16, (px, py) => clamp((py + 420) / 380) * .95, '#04030a');
  });
  plate([[-650, -590], [-440, -694], [-300, -726], [-330, -560], [-560, -506]], [[-610, -575], [-340, -590], [-330, -695], [-540, -535]]);
  plate([[-800, -430], [-630, -476], [-560, -330], [-700, -250], [-840, -300]], [[-770, -410], [-590, -340], [-710, -275]]);
  plate([[-150, -776], [60, -766], [205, -615], [185, -440], [30, -400], [-120, -480], [-195, -640]], [[-115, -745], [50, -735], [170, -610], [155, -460], [-90, -500], [-155, -640]]);
  for (const sm of [[[-560, -516], [-490, -400], [-530, -290], [-420, -190]], [[-330, -560], [-250, -430], [-140, -385], [-80, -260]], [[-120, -470], [-200, -340], [-170, -240]], [[-840, -300], [-770, -190], [-800, -110]], [[-560, -330], [-470, -300], [-380, -330]], [[30, -396], [0, -300], [60, -240]]]) seam(sm, 6, pulse);
  // ---- head
  g.save(); g.translate(170, -560); g.rotate(P.head); g.scale(1.2, 1.2);
  const earP = [[-30, -130], [-110, -300], [-56, -262, 1], [-40, -322, 1], [16, -244], [0, -290, 1], [60, -160]];
  g.save(); g.translate(50, 10); shape(() => sp(earP), { ...O, fill: shade(CC.sinew, .5), sh: 20, bk: 10 }); g.restore();
  // neck pipes
  for (const [a, b, c, w] of [[[-60, 60], [-120, 170], [-60, 280], 44], [[-10, 80], [-40, 190], [30, 290], 34]]) { const cl = cr([a, b, c], 10); shape(() => sp(tube(cl, () => w)), { fill: CC.iron, ow: 8, sh: 10, bk: 4, rw: 6 }); for (let i = 2; i < 10; i += 2) stroke([[cl[i][0] - w * .5, cl[i][1]], [cl[i][0] + w * .5, cl[i][1] + 6]], 5); }
  const jw = P.jaw * .85;
  // mouth interior
  if (P.jaw > .03) {
    const mp = [[40, 50, 1], [470, 40, 1], [20 + 400 * Math.cos(jw) - 20 * Math.sin(jw), 70 + 400 * Math.sin(jw) + 20 * Math.cos(jw), 1], [0, 110, 1]];
    g.fillStyle = CC.mouth; g.beginPath(); sp(mp); g.fill();
    inside(() => sp(mp), () => { glow(60, 110, 330, 'rgba(190,90,255,.95)', pulse); dots(0, 0, 500, 500, 14, (px, py) => clamp(1 - Math.hypot(px - 60, py - 110) / 330) * .8, PAL.vioL); });
  }
  // lower jaw
  g.save(); g.translate(20, 70); g.rotate(jw);
  for (const [tx, l] of [[130, 46], [185, 60], [240, 50], [300, 66], [352, 54], [400, 92]]) shape(() => sp([[tx - 15, 26, 1], [tx + 6, -l, 1], [tx + 20, 28, 1]]), { fill: CC.bone, ow: 6, sh: 8, bk: 0, rw: 3 });
  const lj = [[-50, 0], [120, 18], [300, 26], [432, 6, 1], [408, 62], [250, 104], [80, 112], [-60, 72]];
  shape(() => sp(lj), { ...O, fill: CC.sinew, sh: 30, bk: 14 });
  shape(() => sp([[150, 30, 1], [330, 34, 1], [318, 86, 1], [160, 106, 1]]), { fill: CC.iron, ow: 8, sh: 14, bk: 6, rw: 6, htc: '#000' }); rivets([[175, 50], [305, 52], [300, 76], [180, 90]], CC.ironHi);
  g.restore();
  // upper teeth
  for (const [tx, l] of [[110, 44], [160, 62], [215, 50], [270, 70], [322, 56], [372, 66], [426, 110], [462, 84]]) shape(() => sp([[tx - 17, 48, 1], [tx + 4, 62 + l, 1], [tx + 19, 46, 1]]), { fill: CC.bone, ow: 6, sh: 8, bk: 0, rw: 3 });
  const sk = [[-80, -120], [60, -172], [200, -152], [330, -92], [440, -42], [504, 8, 1], [476, 54], [330, 62], [180, 70], [40, 92], [-90, 70], [-130, -30]];
  shape(() => sp(sk), { ...O, fill: CC.bark, sh: 50, bk: 22 });
  inside(() => sp(sk), () => { for (let i = 0; i < 12; i++) stroke([[-60 + i * 44, -150 + i * 12], [-20 + i * 44, -60 + i * 8], [-50 + i * 46, 60]], 5 + (i % 3) * 3, i % 4 == 2 ? CC.barkHi : INK); g.fillStyle = CC.sinew; g.beginPath(); sp([[330, 20], [480, 0], [500, 60], [320, 64]]); g.fill(); });
  plate([[186, -156], [340, -90], [452, -38], [424, 4], [300, -14], [176, -64]], [[205, -130], [330, -70], [425, -22], [200, -80], [305, -30]]);
  seam([[176, -64], [120, -10], [150, 40]], 5, pulse); seam([[-60, -90], [-20, -20], [-70, 40]], 5, pulse);
  shape(() => sp(earP), { ...O, fill: CC.sinew, sh: 20, bk: 10 });
  stroke([[-40, -170], [-70, -250]], 7); stroke([[-10, -170], [-20, -240]], 6);
  // eyes: burning violet
  for (const [ex, ey, l, a] of [[60, -84, 104, .32], [158, -40, 60, .4]]) {
    shape(() => sp(leafPts(ex - l * .2, ey - 6, l * 1.3, l * .34, a)), { fill: INK, ow: 6, flat: 1 });
    g.fillStyle = lerp(0, 1, gl) > .5 ? '#f6e6ff' : '#3a2050'; g.beginPath(); sp(leafPts(ex, ey, l, l * .2, a)); g.fill();
    glow(ex + l * .4, ey + l * .15, l * 2.6, 'rgba(170,70,255,.9)', pulse); glow(ex + l * .4, ey + l * .15, l * .9, 'rgba(240,210,255,.9)', pulse);
    for (let i = 0; i < 3; i++) stroke([[ex + l * .2, ey - 6], [ex - 40 - i * 30, ey - 60 - i * 22 - (f % 3) * 8], [ex - 110 - i * 40, ey - 70 - i * 50]], 7 - i * 1.5, i ? PAL.vio : PAL.vioL, 2);
  }
  stroke([[-20, -130], [80, -128], [180, -84]], 16);
  g.restore();
  arm([30, -480], P.aN, P.eN, 0);
  g.restore();
  hind(0, 0, P.hind || 0, 0);
  g.restore(); JIT = pj; BOIL = pb;
}
