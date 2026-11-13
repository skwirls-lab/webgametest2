/* ===== Reference fitting =====
   The labelled reference views give, for every part, its outline row by row (front: x extents,
   side: z extents). makeWarp() measures a rough sculpt the same way and returns a warp that
   stretches it, row by row, until its front and side outlines coincide with the reference. */
const RD = {
  _sdf: {},
  /* row extent [a,b] of the union of parts at model height y, or null */
  ext(view, parts, y) {
    const R = REFD.rows[view], t = (R.y0 - y) / R.dy, i = Math.floor(t), f = t - i; let lo = null, hi = null;
    for (const p of parts) {
      const rows = R.parts[p]; if (!rows) continue; const r0 = rows[i], r1 = rows[i + 1], r = r0 && r1 ? [r0[0] + (r1[0] - r0[0]) * f, r0[1] + (r1[1] - r0[1]) * f] : (r0 || r1);
      if (!r) continue; lo = lo === null ? r[0] : Math.min(lo, r[0]); hi = hi === null ? r[1] : Math.max(hi, r[1]);
    }
    return lo === null ? null : [lo, hi];
  },
  yRange(view, parts) { const R = REFD.rows[view]; let a = 1e9, b = -1e9; for (const p of parts) (R.parts[p] || []).forEach((r, i) => { if (r) { a = Math.min(a, i); b = Math.max(b, i); } }); return [R.y0 - b * R.dy, R.y0 - a * R.dy]; },
  /* 2D signed distance (model units, negative inside) to a part's outline in a view: fn(u, y) */
  sdf(view, part) {
    const key = view + part; if (this._sdf[key]) return this._sdf[key];
    const G = REFD.sdf[view][part], bin = atob(G.data), a = new Float32Array(bin.length);
    for (let i = 0; i < bin.length; i++) { const v = bin.charCodeAt(i); a[i] = (v > 127 ? v - 256 : v) * .002; }
    return this._sdf[key] = (u, y) => {
      let fx = (u - G.u0) / (G.sgn * G.d), fy = (G.y0 - y) / G.d, ox = 0, oy = 0;
      if (fx < 0) { ox = -fx; fx = 0; } else if (fx > G.w - 1.001) { ox = fx - (G.w - 1.001); fx = G.w - 1.001; }
      if (fy < 0) { oy = -fy; fy = 0; } else if (fy > G.h - 1.001) { oy = fy - (G.h - 1.001); fy = G.h - 1.001; }
      const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j, k = j * G.w + i;
      return (a[k] * (1 - tx) + a[k + 1] * tx) * (1 - ty) + (a[k + G.w] * (1 - tx) + a[k + G.w + 1] * tx) * ty + Math.hypot(ox, oy) * G.d;
    };
  }
};
const FIT_DY = .005;
function makeWarp(f, o) {
  const b = o.b, n = Math.round((b[4] - b[1]) / FIT_DY) + 1, hx = .004, hz = .005, big = 9;
  const S_ = { a: new Float32Array(n).fill(big), b: new Float32Array(n).fill(-big), z0: new Float32Array(n).fill(big), z1: new Float32Array(n).fill(-big) };
  let jb = -1, jt = -1;
  for (let j = 0; j < n; j++) {                       // measure the sculpt's own outline, row by row
    const y = b[1] + j * FIT_DY;
    for (let x = Math.max(0, b[0]); x <= b[3]; x += hx) for (let z = b[2]; z <= b[5]; z += hz) if (f(x, y, z) < 0) { if (x < S_.a[j]) S_.a[j] = x; if (x > S_.b[j]) S_.b[j] = x; if (z < S_.z0[j]) S_.z0[j] = z; if (z > S_.z1[j]) S_.z1[j] = z; }
    if (S_.b[j] - S_.a[j] > .012) { if (jb < 0) jb = j; jt = j; }
  }
  const ybS = b[1] + jb * FIT_DY, ytS = b[1] + jt * FIT_DY, fr = o.front, sd = o.side;
  let Y = y => y, Yi = y => y;
  if (o.yfit) {
    const [ybR, ytR] = RD.yRange(o.yfit.view || 'front', o.yfit.parts);
    if (o.yfit.mode == 'both') { const k = (ytS - ybS) / (ytR - ybR); Y = y => ybS + (y - ybR) * k; Yi = y => ybR + (y - ybS) / k; }
    else if (o.yfit.mode == 'top') { Y = y => y + ytS - ytR; Yi = y => y - ytS + ytR; }
    else { Y = y => y + ybS - ybR; Yi = y => y - ybS + ybR; }
  }
  const Rf = { a: new Float32Array(n), b: new Float32Array(n), z0: new Float32Array(n), z1: new Float32Array(n) }, okF = new Uint8Array(n), okS = new Uint8Array(n);
  for (let j = jb; j <= jt; j++) {
    const y = Yi(b[1] + j * FIT_DY), ef = fr ? RD.ext(fr.view || 'front', fr.parts, y) : null, es = sd && sd.parts ? RD.ext('side', sd.parts, y) : null;
    if (ef && ef[1] - ef[0] > .006 && y <= (fr.ymax ?? 9) && y >= (fr.ymin ?? -9)) { Rf.a[j] = ef[0]; Rf.b[j] = ef[1]; okF[j] = 1; }
    if (es && es[1] - es[0] > .006 && y <= (sd.ymax ?? 9) && y >= (sd.ymin ?? -9)) { Rf.z0[j] = es[0]; Rf.z1[j] = es[1]; okS[j] = 1; }
  }
  const fill = (ok, keys) => {                          // rows the reference cannot see: copy the nearest scale, not the absolute numbers
    const any = ok.some(v => v);
    for (let j = 0; j < n; j++) {
      if (ok[j]) continue; let m = -1;
      if (any) for (let d = 1; d < n && m < 0; d++) { if (j - d >= 0 && ok[j - d]) m = j - d; else if (j + d < n && ok[j + d]) m = j + d; }
      for (const [kr, ks, lo] of keys) {
        if (m < 0 || S_[ks][j] > 8 || S_[ks][j] < -8) { Rf[kr][j] = S_[ks][j]; continue; }
        const refLo = lo ? Rf[lo[0]][m] : 0, scLo = lo ? S_[lo[1]][m] : 0, k = (Rf[kr][m] - refLo) / Math.max(.004, S_[ks][m] - scLo);
        Rf[kr][j] = lo ? S_[ks][j] : S_[ks][j] * k;       // lower edges keep the sculpt value, upper edges scale with the neighbour
        if (lo) Rf[kr][j] = S_[lo[1]][j] + (S_[ks][j] - S_[lo[1]][j]) * k;
      }
    }
  };
  fill(okF, [['a', 'a', null], ['b', 'b', ['a', 'a']]]); fill(okS, [['z0', 'z0', null], ['z1', 'z1', ['z0', 'z0']]]);
  for (let j = 0; j < n; j++) if (!okF[j] && fr && fr.mode != 'pair') Rf.a[j] = 0;
  const smooth = (arr, w) => { const o2 = new Float32Array(n); for (let j = 0; j < n; j++) { let s = 0, c = 0; for (let d = -w; d <= w; d++) { const q = j + d; if (q >= jb && q <= jt) { s += arr[q]; c++; } } o2[j] = c ? s / c : arr[j]; } return o2; };
  const w = o.smooth ?? 2; for (const k of ['a', 'b', 'z0', 'z1']) { Rf[k] = smooth(Rf[k], w); S_[k] = smooth(S_[k], w); }
  const at = (arr, t) => { const j = Math.max(jb, Math.min(jt - 1e-4, t)), i = Math.floor(j), q = j - i; return arr[i] * (1 - q) + arr[Math.min(jt, i + 1)] * q; };
  const warp = (x, y, z, out) => {
    const ys = Y(y), t = (ys - b[1]) / FIT_DY, px = Math.abs(x); let xs = px, zs = z, kx = 1, kz = 1;
    if (fr) {
      const ar = at(Rf.a, t), br = at(Rf.b, t), as = at(S_.a, t), bs = at(S_.b, t);
      if (fr.mode == 'pair') { kx = S.clamp((bs - as) / Math.max(.004, br - ar), .45, 2.2); xs = Math.max(0, (as + bs) / 2 + (px - (ar + br) / 2) * kx); }
      else { kx = S.clamp(bs / Math.max(.004, br), .45, 2.2); xs = px * kx; }
    }
    if (sd) {
      const z0r = at(Rf.z0, t), z1r = at(Rf.z1, t), z0s = at(S_.z0, t), z1s = at(S_.z1, t);
      if (sd.mode == 'both') { kz = S.clamp((z1s - z0s) / Math.max(.004, z1r - z0r), .45, 2.2); zs = (z0s + z1s) / 2 + (z - (z0r + z1r) / 2) * kz; }
      else if (sd.mode == 'front') { if (z > sd.pivot) { kz = S.clamp((z1s - sd.pivot) / Math.max(.004, z1r - sd.pivot), .45, 2.2); zs = sd.pivot + (z - sd.pivot) * kz; } }
      else if (sd.mode == 'back') { if (z < sd.pivot) { kz = S.clamp((sd.pivot - z0s) / Math.max(.004, sd.pivot - z0r), .45, 2.2); zs = sd.pivot + (z - sd.pivot) * kz; } }
      else if (sd.mode == 'round') { const c = (z0s + z1s) / 2 + (sd.shift || 0); kz = kx; zs = (z0s + z1s) / 2 + (z - c) * kx; }
    }
    out[0] = xs; out[1] = ys; out[2] = zs; out[3] = 1 / Math.max(1, kx, kz);
  };
  const tmp = [0, 0, 0, 1];
  const apply = g => (x, y, z) => { warp(x, y, z, tmp); const s = tmp[3]; return g(x < 0 ? -tmp[0] : tmp[0], tmp[1], tmp[2]) * s; };
  return { f: apply(f), apply, warp };
}

/* trim a generous sculpt to the reference outlines: the result can never stick out past the
   front or side silhouette of its part, and keeps the sculpt's own roundness inside them */
function trim(f, o) {
  const F = o.front ? RD.sdf('front', o.front) : null, Sd = o.side ? RD.sdf('side', o.side) : null, k = o.k ?? .012, inf = o.inflate ?? 0;
  return (x, y, z) => {
    let d = f(x, y, z) - inf;
    if (F) d = S.smax(d, F(Math.abs(x), y), k);
    if (Sd) d = S.smax(d, Sd(z, y), k);
    return d;
  };
}
