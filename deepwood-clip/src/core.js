'use strict';
/* ============ CORE: maths, ink engine, halftone, print post-process ============ */
const W = 1920, H = 1080, FPS = 24, DUR = 12, TAU = Math.PI * 2, INK = '#06060c';
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const smooth = k => k * k * (3 - 2 * k);
const eOut = k => 1 - Math.pow(1 - k, 3), eIn = k => k * k * k;
const eIO = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const eBack = k => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
function rng(s) { let a = s >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(x, y = 0) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function n1(x, k = 7.3) { const i = Math.floor(x), f = x - i; return lerp(hash(i, k), hash(i + 1, k), smooth(f)) * 2 - 1; }
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function shade(hex, k) { // k<1 darken, k>1 lighten
  const n = parseInt(hex.slice(1), 16), f = v => Math.round(clamp(k <= 1 ? v * k : v + (255 - v) * (k - 1), 0, 255));
  return 'rgb(' + f(n >> 16) + ',' + f(n >> 8 & 255) + ',' + f(n & 255) + ')';
}

let g = null;            // current drawing context
let BOIL = 0, JIT = 0;   // hand-drawn line boil (changes "on twos")

/* smooth closed/open path through points; a 3rd element =1 marks a sharp corner */
function sp(pts, closed = true) {
  const n = pts.length, P = new Array(n);
  for (let i = 0; i < n; i++) {
    const p = pts[i]; let x = p[0], y = p[1];
    if (JIT) { x += (hash(p[0] * .37 + BOIL, p[1] * .61) - .5) * JIT; y += (hash(p[1] * .43 - BOIL, p[0] * .29) - .5) * JIT; }
    P[i] = [x, y, p[2] || 0];
  }
  const tan = i => {
    const p = P[i]; if (p[2]) return [0, 0]; let a, b;
    if (closed) { a = P[(i - 1 + n) % n]; b = P[(i + 1) % n]; } else { a = P[Math.max(0, i - 1)]; b = P[Math.min(n - 1, i + 1)]; }
    return [(b[0] - a[0]) / 6, (b[1] - a[1]) / 6];
  };
  g.moveTo(P[0][0], P[0][1]);
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % n, t0 = tan(i), t1 = tan(j);
    g.bezierCurveTo(P[i][0] + t0[0], P[i][1] + t0[1], P[j][0] - t1[0], P[j][1] - t1[1], P[j][0], P[j][1]);
  }
  if (closed) g.closePath();
}
function poly(pts) { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
/* Catmull-Rom resample */
function cr(pts, n) {
  const out = [], m = pts.length - 1;
  for (let k = 0; k <= n; k++) {
    const u = k / n * m, i = Math.min(m - 1, Math.floor(u)), f = u - i;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(m, i + 2)];
    const q = d => .5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * f + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * f * f + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * f * f * f);
    out.push([q(0), q(1)]);
  }
  return out;
}
/* outline polygon of a variable-width tube along a centreline */
function tube(cl, wf) {
  const n = cl.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = cl[Math.max(0, i - 1)], b = cl[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const w = wf(i / (n - 1)) * .5;
    L.push([cl[i][0] - dy * w, cl[i][1] + dx * w]); R.push([cl[i][0] + dy * w, cl[i][1] - dx * w]);
  }
  return L.concat(R.reverse());
}
/* tapered brush-pen stroke. tp: 3 both ends, 2 tail, 1 head, 0 none */
function stroke(pts, w, col = INK, tp = 3) {
  const cl = pts.length < 7 ? cr(pts.length == 2 ? [pts[0], [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2], pts[1]] : pts, 9) : pts;
  const wf = k => w * (tp == 3 ? Math.pow(Math.sin(Math.PI * clamp(k, .03, .97)), .6) : tp == 2 ? Math.pow(1 - k, .7) + .06 : tp == 1 ? Math.pow(k, .7) + .06 : 1);
  g.fillStyle = col; g.beginPath(); sp(tube(cl, wf)); g.fill();
}
function cap(x1, y1, x2, y2, w1, w2) {
  const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, nx = -uy, ny = ux; w1 /= 2; w2 /= 2;
  return [[x1 + nx * w1, y1 + ny * w1], [x2 + nx * w2, y2 + ny * w2], [x2 + ux * w2, y2 + uy * w2], [x2 - nx * w2, y2 - ny * w2], [x1 - nx * w1, y1 - ny * w1], [x1 - ux * w1, y1 - uy * w1]];
}
function ell(cx, cy, rx, ry, rot = 0, n = 10) {
  const o = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return o;
}

/* ---- halftone ---- */
const _ht = {};
function HT(col, cell = 9, r = .34) {
  const k = col + cell + '_' + r; if (_ht[k]) return _ht[k];
  const c = mk(cell * 2, cell * 2), x = c.getContext('2d'); x.fillStyle = col; const R = cell * r, s = cell * 2;
  for (const [px, py] of [[0, 0], [s, 0], [0, s], [s, s], [s / 2, s / 2]]) { x.beginPath(); x.arc(px, py, R * 1.42, 0, TAU); x.fill(); }
  return _ht[k] = g.createPattern(c, 'repeat');
}
/* gradient halftone field: fn(x,y) -> 0..1 dot size */
function dots(x0, y0, x1, y1, cell, fn, col) {
  g.fillStyle = col; g.beginPath(); let row = 0;
  for (let y = y0; y <= y1; y += cell / 2, row++)
    for (let x = x0 + (row & 1 ? cell / 2 : 0); x <= x1; x += cell) {
      const r = fn(x, y) * cell * .5; if (r > .5) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }
    }
  g.fill();
}

/* ---- the cel/ink shape primitive ----
   thick variable-weight outline, flat fill, halftone + spotted-black shadow crescents, rim lights */
const LT = { sx: .55, sy: -.83, ht: '#0d1433', tone: 'rgba(9,12,44,.5)', bk: INK, lights: [{ x: .55, y: -.83, col: '#dbe6ff', k: 1 }] };
function shape(path, o = {}) {
  const m = g.getTransform(), sc = Math.hypot(m.a, m.b), ow = o.ow ?? 5, lx = LT.sx, ly = LT.sy;
  const at = (dx, dy) => g.setTransform(m.a, m.b, m.c, m.d, m.e + dx, m.f + dy);
  g.save();
  if (ow > 0) {
    g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = o.ink || INK;
    const d = ow * sc * .5; at(-lx * d, -ly * d); g.lineWidth = ow * 1.9; g.beginPath(); path(); g.stroke();
    at(0, 0); g.lineWidth = ow * 1.25; g.beginPath(); path(); g.stroke();
  }
  at(0, 0); g.beginPath(); path(); g.fillStyle = o.fill; g.fill();
  if (!o.flat) {
    g.clip();
    const cres = (dx, dy, style) => {
      g.beginPath(); g.setTransform(1, 0, 0, 1, 0, 0); g.rect(-6000, -6000, 16000, 16000);
      at(dx, dy); path(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = style; g.fill('evenodd');
    };
    const s = (o.sh ?? 14) * sc;
    if (s > 0) { cres(lx * s * 1.5, ly * s * 1.5, HT(o.htc || LT.ht, o.cell || 9, .3)); cres(lx * s * .8, ly * s * .8, LT.tone); }
    const b = (o.bk ?? 5) * sc; if (b > 0) cres(lx * b, ly * b, LT.bk);
    const rw = (o.rw ?? 4) * sc;
    if (rw > 0) for (const l of LT.lights) { const r = rw * l.k; if (r > .4) cres(-l.x * r, -l.y * r, l.col); }
  }
  g.restore();
}
/* clip to a path, run fn in clipped state */
function inside(path, fn) { g.save(); g.beginPath(); path(); g.clip(); fn(); g.restore(); }
function glow(x, y, r, col, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
}

/* ---- comic SFX lettering built from strokes (no fonts) ---- */
const GLY = {
  K: [[[0, 0], [0, 1]], [[.8, 0], [.05, .55], [.85, 1]]],
  R: [[[0, 1], [0, 0], [.7, 0], [.82, .25], [.7, .5], [0, .5]], [[.35, .5], [.85, 1]]],
  A: [[[0, 1], [.45, 0], [.9, 1]], [[.2, .64], [.7, .64]]],
  H: [[[0, 0], [0, 1]], [[.8, 0], [.8, 1]], [[0, .5], [.8, .5]]],
  '!': [[[.25, 0], [.2, .62]], [[.18, .88], [.18, 1]]]
};
function sfx(txt, x, y, size, o = {}) {
  const r = rng(o.seed || 5); g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.transform(1, 0, o.skew ?? -.25, 1, 0, 0);
  g.lineJoin = 'miter'; g.miterLimit = 6; g.lineCap = 'square';
  const L = [...txt].map((ch, i) => ({ ch, x: i * size * (o.sp || .95), y: (r() - .5) * size * .22 + (o.arc || 0) * Math.pow(i - (txt.length - 1) / 2, 2), s: size * (1 + (o.grow || 0) * i) * (.9 + r() * .2), a: (r() - .5) * .22 }));
  const pass = (lw, col, dx, dy) => {
    g.strokeStyle = col;
    for (const l of L) {
      g.save(); g.translate(l.x + dx, l.y + dy); g.rotate(l.a); g.lineWidth = lw * l.s;
      for (const pl of GLY[l.ch] || []) { g.beginPath(); pl.forEach((p, i) => i ? g.lineTo(p[0] * l.s * .78, (p[1] - .5) * l.s) : g.moveTo(p[0] * l.s * .78, (p[1] - .5) * l.s)); g.stroke(); }
      g.restore();
    }
  };
  pass(.34, INK, size * .05, size * .06); pass(.32, INK, 0, 0); pass(.19, o.col || '#fff', 0, 0);
  if (o.col2) pass(.07, o.col2, -size * .01, -size * .015);
  g.restore();
}

/* ---- print post-process: paint texture, grain, vignette, colour misregistration ---- */
const SB = mk(W, H), CR_ = mk(W, H), CG_ = mk(W, H);
let TEX, GRAIN, VIG;
function buildPost() {
  const r = rng(99);
  TEX = mk(W, H); let x = TEX.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) { // long dry-brush strokes
    const px = r() * W, py = r() * H, len = 80 + r() * 420, a = -.35 + (r() - .5) * .5, v = r() < .5 ? 255 : 0;
    x.save(); x.translate(px, py); x.rotate(a); x.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (.025 + r() * .05) + ')';
    const hw = 3 + r() * 22; for (let j = 0; j < 5; j++) x.fillRect(-len / 2 + r() * 30, -hw + j * hw * .4 + r() * 3, len - r() * 80, hw * .3);
    x.restore();
  }
  GRAIN = mk(512, 512); x = GRAIN.getContext('2d'); const id = x.createImageData(512, 512);
  for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() - .5) * 90; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  x.putImageData(id, 0, 0);
  VIG = mk(W, H); x = VIG.getContext('2d'); const gr = x.createRadialGradient(W / 2, H / 2, H * .42, W / 2, H / 2, H * 1.08);
  gr.addColorStop(0, 'rgba(0,0,8,0)'); gr.addColorStop(1, 'rgba(0,0,8,.82)'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
}
function present(out, mis, f) {
  const s = SB.getContext('2d'); s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalCompositeOperation = 'overlay'; s.globalAlpha = .7; s.drawImage(TEX, 0, 0);
  s.globalAlpha = .5; const ox = Math.floor(hash(f, 1) * 512), oy = Math.floor(hash(f, 2) * 512);
  for (let y = -oy; y < H; y += 512) for (let x = -ox; x < W; x += 512) s.drawImage(GRAIN, x, y);
  s.globalAlpha = 1; s.globalCompositeOperation = 'source-over'; s.drawImage(VIG, 0, 0);
  for (const [c, col] of [[CR_, '#ff0000'], [CG_, '#00ffff']]) {
    const x = c.getContext('2d'); x.globalCompositeOperation = 'copy'; x.drawImage(SB, 0, 0);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = col; x.fillRect(0, 0, W, H);
  }
  out.globalCompositeOperation = 'source-over'; out.fillStyle = '#000'; out.fillRect(0, 0, W, H);
  out.globalCompositeOperation = 'lighter';
  out.drawImage(CR_, mis - 8, -4, W + 16, H + 8); out.drawImage(CG_, -mis * .6 - 8, mis * .45 - 4, W + 16, H + 8);
  out.globalCompositeOperation = 'source-over';
}
