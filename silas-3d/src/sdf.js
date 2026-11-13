'use strict';
/* ===== Sculpting kit: signed-distance primitives + surface-nets mesher =====
   Characters are "sculpted" as smooth blends of simple volumes, then meshed. */
const S = {
  len: (x, y, z) => Math.sqrt(x * x + y * y + z * z),
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  mix: (a, b, t) => a + (b - a) * t,
  ss: (a, b, x) => { const t = S.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); },
  sph: (x, y, z, cx, cy, cz, r) => S.len(x - cx, y - cy, z - cz) - r,
  ell(x, y, z, cx, cy, cz, rx, ry, rz) {
    const px = x - cx, py = y - cy, pz = z - cz, k0 = S.len(px / rx, py / ry, pz / rz), k1 = S.len(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
    return k1 < 1e-9 ? -Math.min(rx, ry, rz) : k0 * (k0 - 1) / k1;
  },
  /* tapered capsule from a (radius ra) to b (radius rb) */
  cone(x, y, z, ax, ay, az, bx, by, bz, ra, rb) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, t = S.clamp(((x - ax) * dx + (y - ay) * dy + (z - az) * dz) / (dx * dx + dy * dy + dz * dz), 0, 1);
    return S.len(x - ax - dx * t, y - ay - dy * t, z - az - dz * t) - (ra + (rb - ra) * t);
  },
  box(x, y, z, cx, cy, cz, hx, hy, hz, r = 0) {
    const qx = Math.abs(x - cx) - hx + r, qy = Math.abs(y - cy) - hy + r, qz = Math.abs(z - cz) - hz + r;
    return S.len(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
  },
  smin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; },
  smax(a, b, k) { return -S.smin(-a, -b, k); },
  hash(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
};

/* naive surface nets: f(x,y,z) -> distance; bounds [x0,y0,z0,x1,y1,z1]; h = voxel size */
function surfaceNets(f, b, h) {
  const nx = Math.ceil((b[3] - b[0]) / h) + 1, ny = Math.ceil((b[4] - b[1]) / h) + 1, nz = Math.ceil((b[5] - b[2]) / h) + 1;
  const v = new Float32Array(nx * ny * nz), at = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[at(i, j, k)] = f(b[0] + i * h, b[1] + j * h, b[2] + k * h);
  const vid = new Int32Array(nx * ny * nz).fill(-1), pos = [], idx = [];
  const C = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let m = 0; const g = [];
    for (let c = 0; c < 8; c++) { const d = v[at(i + C[c][0], j + C[c][1], k + C[c][2])]; g.push(d); if (d < 0) m |= 1 << c; }
    if (m == 0 || m == 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, c] of E) {
      if ((g[a] < 0) == (g[c] < 0)) continue; const t = g[a] / (g[a] - g[c]);
      sx += C[a][0] + (C[c][0] - C[a][0]) * t; sy += C[a][1] + (C[c][1] - C[a][1]) * t; sz += C[a][2] + (C[c][2] - C[a][2]) * t; n++;
    }
    vid[at(i, j, k)] = pos.length / 3; pos.push(b[0] + (i + sx / n) * h, b[1] + (j + sy / n) * h, b[2] + (k + sz / n) * h);
  }
  const quad = (a, b2, c, d, flip) => { if (a < 0 || b2 < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b2, a, d, c); else idx.push(a, b2, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const s0 = v[at(i, j, k)] < 0;
    if (s0 != (v[at(i + 1, j, k)] < 0)) quad(vid[at(i, j - 1, k - 1)], vid[at(i, j, k - 1)], vid[at(i, j, k)], vid[at(i, j - 1, k)], !s0);
    if (s0 != (v[at(i, j + 1, k)] < 0)) quad(vid[at(i - 1, j, k - 1)], vid[at(i - 1, j, k)], vid[at(i, j, k)], vid[at(i, j, k - 1)], !s0);
    if (s0 != (v[at(i, j, k + 1)] < 0)) quad(vid[at(i - 1, j - 1, k)], vid[at(i, j - 1, k)], vid[at(i, j, k)], vid[at(i - 1, j, k)], !s0);
  }
  // relax onto the true surface and take normals from the field gradient
  const P = new Float32Array(pos), N = new Float32Array(pos.length), e = h * .5;
  for (let q = 0; q < P.length; q += 3) {
    let x = P[q], y = P[q + 1], z = P[q + 2], gx, gy, gz, l;
    for (let it = 0; it < 2; it++) {
      gx = f(x + e, y, z) - f(x - e, y, z); gy = f(x, y + e, z) - f(x, y - e, z); gz = f(x, y, z + e) - f(x, y, z - e); l = Math.hypot(gx, gy, gz) || 1; gx /= l; gy /= l; gz /= l;
      if (it == 0) { const d = S.clamp(f(x, y, z), -h, h) * .8; x -= gx * d; y -= gy * d; z -= gz * d; }
    }
    P[q] = x; P[q + 1] = y; P[q + 2] = z; N[q] = gx; N[q + 1] = gy; N[q + 2] = gz;
  }
  for (let t = 0; t < idx.length; t += 3) { // make every triangle face along the field gradient
    const a = idx[t] * 3, b2 = idx[t + 1] * 3, c = idx[t + 2] * 3, ux = P[b2] - P[a], uy = P[b2 + 1] - P[a + 1], uz = P[b2 + 2] - P[a + 2], wx = P[c] - P[a], wy = P[c + 1] - P[a + 1], wz = P[c + 2] - P[a + 2];
    if ((uy * wz - uz * wy) * (N[a] + N[b2] + N[c]) + (uz * wx - ux * wz) * (N[a + 1] + N[b2 + 1] + N[c + 1]) + (ux * wy - uy * wx) * (N[a + 2] + N[b2 + 2] + N[c + 2]) < 0) { const tmp = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = tmp; }
  }
  return { pos: P, nrm: N, idx: new Uint32Array(idx) };
}
const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
/* part = {name, b, h, f, col(x,y,z)->[r,g,b], gloss} -> THREE.BufferGeometry with colour */
function sculpt(part) {
  const m = surfaceNets(part.f, part.b, part.h), col = new Float32Array(m.pos.length);
  for (let q = 0; q < m.pos.length; q += 3) { const c = part.col(m.pos[q], m.pos[q + 1], m.pos[q + 2]); col[q] = c[0]; col[q + 1] = c[1]; col[q + 2] = c[2]; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(m.nrm, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(m.idx, 1)); return g;
}
