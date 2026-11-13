/* ============ THE DEEPWOOD: colossal trunks, arching roots, moon shafts, mist ============ */
const PAL = {
  sky0: '#02040a', sky1: '#081028', sky2: '#16244e', sky3: '#2b4079', moon: '#eef3ff',
  far: '#2c3f72', farHi: '#5871b0', far2: '#223160', mid: '#15203f', midHi: '#6d8bd2', near: '#0a1024', nearHi: '#93aeea',
  moss: '#1f4a5e', mossL: '#4c8f9c', vio: '#9a45ff', vioL: '#d6adff', vioD: '#48188c', azure: '#19a8ff', azL: '#9fe8ff'
};
const TIER = {
  far: { fill: PAL.far, hi: PAL.farHi, ow: 3, bark: .35, htc: '#16224a', ink: '#0d1634' },
  far2: { fill: PAL.far2, hi: '#4a63a4', ow: 4, bark: .6, htc: '#0f1838', ink: '#090f26' },
  mid: { fill: PAL.mid, hi: PAL.midHi, ow: 6, bark: 1, htc: '#070b1c' },
  near: { fill: PAL.near, hi: PAL.nearHi, ow: 8, bark: 1, htc: '#04060f' }
};
function layer(w, h, fn) { const c = mk(w, h), pg = g; g = c.getContext('2d'); fn(g); g = pg; return c; }
function mist(x, y, rx, ry, col, a) {
  g.save(); g.translate(x, y); g.scale(1, ry / rx); const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0, col); gr.addColorStop(.5, shade(col, .45)); gr.addColorStop(1, '#000');
  g.globalCompositeOperation = 'screen'; g.globalAlpha = a; g.fillStyle = gr; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore();
}
function ray(x0, w0, x1, w1, y0, y1, a, col = '#a9c2ff') {
  const P = [[x0, y0], [x0 + w0, y0], [x1 + w1, y1], [x1, y1]];
  g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = a;
  const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, col); gr.addColorStop(.55, shade(col, .45)); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.beginPath(); poly(P); g.fill();
  g.clip(); g.globalAlpha = a * .8;
  dots(Math.min(x0, x1), y0, Math.max(x0 + w0, x1 + w1), y1, 14, (x, y) => { const k = (y - y0) / (y1 - y0); return clamp(.75 - k * .9) * (.5 + .5 * Math.sin(x * .013 + y * .004)); }, col);
  g.restore();
}
function sky(w, h, mx, my, mr) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, PAL.sky0); gr.addColorStop(.4, PAL.sky1); gr.addColorStop(.78, PAL.sky2); gr.addColorStop(1, PAL.sky3);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  if (mr) {
    glow(mx, my, mr * 9, 'rgba(70,100,200,.6)'); glow(mx, my, mr * 3.2, 'rgba(190,210,255,.7)');
    g.save(); g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fillStyle = PAL.moon; g.fill(); g.clip();
    const r = rng(8); g.fillStyle = '#c4d0f0'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(mx + (r() - .5) * mr * 1.6, my + (r() - .5) * mr * 1.6, mr * (.08 + r() * .2), 0, TAU); g.fill(); }
    dots(mx - mr, my - mr, mx + mr, my + mr, 8, (x, y) => clamp(((mx - x) + (y - my)) / mr * .45), '#9fb0de');
    g.restore();
    g.lineWidth = 4; g.strokeStyle = '#fff'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.stroke();
  }
}
function canopy(x0, x1, y, depth, seed, col, n) {
  const r = rng(seed); g.fillStyle = col; g.beginPath();
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, r()), yy = y + Math.pow(r(), 2.2) * depth * (.6 + .4 * Math.sin(x * .004 + seed)), a = (r() - .5) * 2, rx = 14 + r() * 34, ry = rx * (.3 + r() * .25);
    g.ellipse(x, yy, rx, ry, a, 0, TAU); g.closePath();
  }
  g.fill();
}
/* one colossal trunk with buttress roots, bark inks, halftone shadow side, moonlit side */
function trunk(x, w, base, top, T, o = {}) {
  const r = rng(o.seed || 1), lean = o.lean || 0, fl = w * (o.flare ?? .42), xl = x - w / 2, xr = x + w / 2, hgt = base - top;
  const jx = () => (r() - .5) * w * .05;
  const pts = [[xl + lean, top, 1], [xl + lean * .65 + jx(), top + hgt * .35], [xl + lean * .35 + jx(), top + hgt * .65], [xl - fl * .1, base - w * .8], [xl - fl * .5, base - w * .26], [xl - fl, base, 1]];
  const nt = 3 + ((r() * 3) | 0), sx = (w + fl * 2) / nt;
  for (let i = 1; i < nt; i++) { const xx = xl - fl + sx * i; pts.push([xx - sx * .25, base + w * .015], [xx, base - w * (.07 + r() * .13)], [xx + sx * .2, base + w * .01]); }
  pts.push([xr + fl, base, 1], [xr + fl * .5, base - w * .26], [xr + fl * .1, base - w * .8], [xr + lean * .35 + jx(), top + hgt * .65], [xr + lean * .65 + jx(), top + hgt * .35], [xr + lean, top, 1]);
  const path = () => sp(pts), fx = y => lean * clamp(1 - (y - top) / hgt);
  shape(path, { fill: T.fill, ow: T.ow, sh: w * .1, bk: w * .035, rw: w * .022, htc: T.htc, ink: T.ink });
  inside(path, () => {
    // shadow side gradient halftone + spotted blacks
    dots(xl - fl, top, x + w * .2, base, Math.max(9, w * .028), (px, py) => clamp(1.05 - (px - (xl + fx(py))) / (w * .55)) * .95, T.htc);
    const nb = Math.round(w / 11 * T.bark);
    for (let i = 0; i < nb; i++) { // bark: long tapered ink strokes that follow the lean
      const u = r(), y0 = top + r() * hgt * .95, len = hgt * (.08 + r() * .3), wob = (r() - .5) * w * .05;
      const xa = xl + u * w + (y0 > base - w * .8 ? (u - .5) * fl * 1.6 * Math.pow((y0 - (base - w * .8)) / (w * .8), 1.5) : 0);
      const y1 = Math.min(base, y0 + len), sw = (1.5 + r() * w * .014) * (u < .4 ? 1.8 : 1);
      stroke([[xa + fx(y0), y0], [xa + fx((y0 + y1) / 2) + wob, (y0 + y1) / 2], [xa + fx(y1) + (y1 > base - w * .5 ? (u - .5) * fl * .8 : 0), y1]], sw, T.ink || INK);
    }
    for (let i = 0; i < 3 * T.bark; i++) { // big spotted-black wedges
      const y0 = top + r() * hgt * .8, u = r() * .3;
      stroke([[xl + u * w + fx(y0), y0], [xl + u * w + fx(y0 + 90) - 8, y0 + hgt * .12], [xl + u * w + fx(y0 + 200), y0 + hgt * .3]], w * (.03 + r() * .05), T.ink || INK);
    }
    for (let i = 0; i < w / 16; i++) { // moonlit side: dry-brush light streaks
      const u = .72 + r() * .27, y0 = top + r() * hgt * .9, len = hgt * (.05 + r() * .2);
      stroke([[xl + u * w + fx(y0), y0], [xl + u * w + fx(y0 + len / 2) + (r() - .5) * 6, y0 + len / 2], [xl + u * w + fx(y0 + len), y0 + len]], 2 + r() * w * .018 * (u > .88 ? 1.6 : .8), T.hi);
    }
  });
}
/* thick root / tail / arch along a centreline */
function offs(cl, wf, off) {
  return cl.map((p, i) => { const a = cl[Math.max(0, i - 1)], b = cl[Math.min(cl.length - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; const w = wf(i / (cl.length - 1)) * .5 * off; return [p[0] - dy / d * w, p[1] + dx / d * w]; });
}
function rootTube(ctrl, w0, w1, T, o = {}) {
  const cl = cr(ctrl, o.n || 28), sd = o.seed || 3, wf = k => lerp(w0, w1, k) * (1 + .1 * Math.sin(k * 11 + sd)) * (o.wf ? o.wf(k) : 1);
  const pts = tube(cl, wf), path = () => sp(pts), r = rng(sd);
  shape(path, { fill: T.fill, ow: T.ow, sh: o.sh ?? w0 * .2, bk: o.bk ?? w0 * .08, rw: o.rw ?? w0 * .05, htc: T.htc, ink: T.ink });
  inside(path, () => {
    for (let j = 0; j < (o.lines ?? 9); j++) {
      const off = (r() - .5) * 1.5, a = r() * .7, b = a + .12 + r() * .3, ln = offs(cl, wf, off).filter((p, i) => { const k = i / (cl.length - 1); return k >= a && k <= b; });
      if (ln.length > 2) stroke(ln, 2 + r() * w0 * .03, off * LT.sy * -1 > .2 ? T.hi : (T.ink || INK));
    }
  });
  if (o.moss) { // hanging moss tendrils
    const lo = offs(cl, wf, 1), up = offs(cl, wf, -1);
    for (let i = 2; i < cl.length - 2; i++) {
      const p = lo[i][1] > up[i][1] ? lo[i] : up[i], q = lo[i][1] > up[i][1] ? up[i] : lo[i];
      if (r() < .6) for (let j = 0; j < 3; j++) { const hx = p[0] + (r() - .5) * 40, l = w0 * (.25 + r() * .9); stroke([[hx, p[1] - 6], [hx + 5, p[1] + l * .5], [hx - 3, p[1] + l]], 3.5, j ? PAL.moss : PAL.mossL, 2); }
      if (r() < .5) stroke([[q[0] - 30, q[1] + 5], [q[0], q[1] - 3], [q[0] + 34, q[1] + 6]], 9, PAL.moss);
    }
  }
}
function groundBand(x0, x1, yf, bottom, T, o = {}) {
  const pts = [[x0, bottom, 1], [x0, yf(x0), 1]]; for (let x = x0 + 60; x < x1; x += 60) pts.push([x, yf(x)]); pts.push([x1, yf(x1), 1], [x1, bottom, 1]);
  shape(() => sp(pts), { fill: T.fill, ow: T.ow, sh: 26, bk: 0, rw: o.rw ?? 5, htc: T.htc });
  const r = rng(o.seed || 4);
  for (let i = 0; i < (x1 - x0) / 22; i++) { // grass + pebble inks
    const x = lerp(x0, x1, r()), y = yf(x), h = 8 + r() * 26;
    stroke([[x, y + 4], [x + (r() - .5) * 14, y - h]], 3 + r() * 3, r() < .3 ? T.hi : T.fill, 2);
  }
  for (let i = 0; i < (x1 - x0) / 60; i++) { const x = lerp(x0, x1, r()), y = yf(x) + 14 + r() * (bottom - yf(x)) * .5; stroke([[x, y], [x + 30 + r() * 90, y + (r() - .5) * 8]], 3 + r() * 4, r() < .35 ? shade(T.hi, .45) : INK); }
}
function leafPts(x, y, len, wd, a) {
  const c = Math.cos(a), s = Math.sin(a), q = (u, v) => [x + u * c - v * s, y + u * s + v * c];
  return [q(0, 0), q(len * .35, -wd), [...q(len, 0), 1], q(len * .4, wd)];
}
function fern(x, y, s, seed, col, hi) {
  const r = rng(seed), nf = 5 + ((r() * 3) | 0);
  for (let f = 0; f < nf; f++) {
    const a0 = -Math.PI / 2 + (f / (nf - 1) - .5) * 2.3 + (r() - .5) * .2, len = (220 + r() * 200) * s, bend = (a0 + Math.PI / 2) * .7;
    const st = []; for (let i = 0; i <= 12; i++) { const k = i / 12, a = a0 + bend * k; st.push([x + Math.cos(a) * len * k, y + Math.sin(a) * len * k + k * k * len * .25]); }
    stroke(st, 7 * s, col, 2);
    g.fillStyle = col; g.beginPath();
    for (let i = 1; i < 12; i++) { const k = i / 12, p = st[i], q = st[i + 1], a = Math.atan2(q[1] - p[1], q[0] - p[0]), l = len * .2 * (1 - k * .8); sp(leafPts(p[0], p[1], l, l * .2, a + 1.1)); sp(leafPts(p[0], p[1], l, l * .2, a - 1.1)); }
    g.fill();
    if (hi) { g.fillStyle = hi; g.beginPath(); for (let i = 2; i < 12; i += 2) { const k = i / 12, p = st[i], q = st[i + 1], a = Math.atan2(q[1] - p[1], q[0] - p[0]), l = len * .17 * (1 - k * .8); sp(leafPts(p[0], p[1] - 3, l, l * .07, a - 1.1)); } g.fill(); }
  }
}
function broadleaf(x, y, s, seed, col, hi) {
  const r = rng(seed);
  for (let f = 0; f < 4; f++) {
    const a = -Math.PI / 2 + (r() - .5) * 1.6, len = (160 + r() * 200) * s, tx = x + Math.cos(a) * len, ty = y + Math.sin(a) * len;
    stroke([[x, y], [(x + tx) / 2 + (r() - .5) * 40, (y + ty) / 2], [tx, ty]], 6 * s, col, 2);
    g.fillStyle = col; g.beginPath();
    for (let i = 0; i < 5; i++) { const k = .35 + i * .16, la = a + (i % 2 ? 1 : -1) * (.7 + r() * .4), l = (90 + r() * 60) * s; sp(leafPts(lerp(x, tx, k), lerp(y, ty, k), l, l * .28, la)); }
    g.fill();
    if (hi) { g.fillStyle = hi; g.beginPath(); for (let i = 0; i < 5; i += 2) { const k = .35 + i * .16, l = 80 * s; sp(leafPts(lerp(x, tx, k) + 4, lerp(y, ty, k) - 6, l, l * .05, a - .9)); } g.fill(); }
  }
}
/* drifting live mist + floating motes (drawn every frame) */
function liveMist(t, y, col, a, n = 5, sp_ = 40, seed = 0) {
  for (let i = 0; i < n; i++) { const x = ((hash(i, seed) * 2600 + t * sp_ * (.5 + hash(i, seed + 1))) % 2600) - 340; mist(x, y + (hash(i, seed + 2) - .5) * 120, 520 + hash(i, seed + 3) * 300, 90 + hash(i, seed + 4) * 70, col, a); }
}
function motes(t, n, col, seed = 0, vx = 0) {
  g.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const x = (((hash(i, seed) * W + t * (vx + (hash(i, seed + 5) - .5) * 30)) % W) + W) % W, y = (hash(i, seed + 1) * H + Math.sin(t * .8 + i) * 18 - t * 8 * hash(i, seed + 2) + H) % H, s = 1.5 + hash(i, seed + 3) * 3.5;
    g.globalAlpha = .25 + .6 * hash(i, seed + 4); g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}
/* ink speed lines across the frame (jump on twos) */
function speedLines(f, n, col, o = {}) {
  for (let i = 0; i < n; i++) {
    const y = (o.y0 ?? 0) + hash(i, f * 3.1 + 1) * ((o.y1 ?? H) - (o.y0 ?? 0)), len = 200 + hash(i, f + 2) * (o.len || 900), x = hash(i, f * 1.7 + 3) * (W + len) - len;
    stroke([[x, y], [x + len * .5, y + (o.slope || 0) * len * .5], [x + len, y + (o.slope || 0) * len]], (o.w || 5) * (.4 + hash(i, f + 4)), col, o.tp ?? 1);
  }
}
/* radial burst lines for impact frames */
function burst(cx, cy, r0, r1, n, col, f, w = 26) {
  g.fillStyle = col; g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + hash(i, f) * .2, ra = r0 * (.75 + hash(i, f + 1) * .7), wd = (w / r1) * (.4 + hash(i, f + 2));
    g.moveTo(cx + Math.cos(a) * ra, cy + Math.sin(a) * ra); g.lineTo(cx + Math.cos(a - wd) * r1, cy + Math.sin(a - wd) * r1); g.lineTo(cx + Math.cos(a + wd) * r1, cy + Math.sin(a + wd) * r1); g.closePath();
  }
  g.fill();
}
