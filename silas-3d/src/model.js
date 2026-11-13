/* ===== SILAS — sculpted in bind pose. Units: feet at y=0, ear tips ~2.0, facing +z.
   Parts are rough sculpts (blended volumes) that fit.js stretches or trims onto the reference outlines.
   Landmarks come from gridded crops of the reference sheet (see tools/). ===== */
const COL = {
  fur: hex('#7f7772'), furD: hex('#5f5752'), white: hex('#d8cfc4'), ring: hex('#b9b0a5'), cloak: hex('#86674a'), cloakD: hex('#4a3a2c'), green: hex('#565c47'),
  cream: hex('#978d77'), leather: hex('#40342c'), leatherL: hex('#6a5646'), belt: hex('#4b3d32'), trou: hex('#4a443a'), steel: hex('#a3a19c'), ear: hex('#a8887f'),
  pend: hex('#6a574a'), claw: hex('#1d1a17'), eye: hex('#15100e'), iris: hex('#241b16'), nose: hex('#6b524c')
};
const BZ = -.06;
/* ---------- head ---------- */
const EYE = { c: [.0875, 1.775, .0875], t: [.59, 0, -.81], n: [.81, 0, .59] };       // socket centre, long axis, outward normal
function eyeLocal(px, y, z) {            // -> [along the eye, up (tilted: inner corner lower), outward]
  const dx = px - EYE.c[0], dy = y - EYE.c[1], dz = z - EYE.c[2], u = dx * EYE.t[0] + dz * EYE.t[2], w = dx * EYE.n[0] + dz * EYE.n[2], c = Math.cos(.35), s = Math.sin(.35);
  return [u * c - dy * s, u * s + dy * c, w];
}
const socket = (px, y, z) => { const e = eyeLocal(px, y, z), k = 1 - .3 * S.clamp(Math.abs(e[0]) / .05, 0, 1); return S.ell(e[0], e[1], e[2], 0, 0, 0, .05, .03 * k + .003, .03); };   // almond: pinched corners
function headS(px, y, z) {
  let d = S.ell(px, y, z, 0, 1.786, -.01, .128, .118, .13);                                   // cranium: one smooth dome
  d = S.smin(d, S.ell(px, y, z, .07, 1.715, .02, .098, .076, .1), .05);                       // cheeks
  d = S.smin(d, S.cone(px, y, z, 0, 1.8, .06, 0, 1.722, .185, .07, .036), .05);               // bridge: straight slope from brow to nose
  d = S.smin(d, S.cone(px, y, z, 0, 1.7, .09, 0, 1.69, .18, .066, .04), .04);                 // upper lip
  d = S.smin(d, S.ell(px, y, z, .068, 1.818, .078, .046, .022, .04), .03);                    // brow
  d = S.smin(d, S.cone(px, y, z, .12, 1.74, -.005, .2, 1.755, -.03, .04, .01), .014);         // cheek ruff: three bold tufts
  d = S.smin(d, S.cone(px, y, z, .12, 1.708, -.005, .2, 1.7, -.04, .04, .01), .014);
  d = S.smin(d, S.cone(px, y, z, .11, 1.675, 0, .185, 1.645, -.035, .038, .01), .014);
  d = S.smin(d, S.ell(px, y, z, 0, 1.672, .03, .095, .06, .1), .05);                          // rounded jaw underside
  d = S.smin(d, S.ell(px, y, z, 0, 1.648, .12, .045, .024, .07), .02);                        // lower lip and chin
  return S.smax(d, -socket(px, y, z), .006);
}
const headF = trim((x, y, z) => headS(Math.abs(x), y, z), { front: 'head', side: 'head', k: .007 });
function throatS(px, y, z) {             // furry throat that tapers into the hood collar
  let d = S.cone(px, y, z, 0, 1.65, -.012, 0, 1.43, .0, .1, .1);
  for (const [tx, ty] of [[0, 1.45], [.045, 1.47], [.085, 1.5]]) d = S.smin(d, S.cone(px, y, z, tx * .6, ty + .08, .06, tx, ty, .1, .034, .006), .012);       // chest ruff
  return d;
}
const throatF = (x, y, z) => throatS(Math.abs(x), y, z);
const eyeC = [EYE.c[0] - EYE.n[0] * .03, EYE.c[1], EYE.c[2] - EYE.n[2] * .03];
const eyeF = (x, y, z) => S.sph(Math.abs(x), y, z, eyeC[0], eyeC[1], eyeC[2], .0365);
const noseF = (x, y, z) => Math.min(S.ell(x, y, z, 0, 1.703, .2175, .027, .018, .019), S.cone(x, y, z, 0, 1.69, .228, 0, 1.672, .221, .004, .003));
const jawF = trim((x, y, z) => S.smin(S.ell(x, y, z, 0, 1.643, .132, .04, .019, .062), S.ell(x, y, z, 0, 1.634, .1, .04, .018, .055), .02), { front: 'head', side: 'head', k: .004 });
/* ---------- ears: tall, broad-based, cupped, tufted ---------- */
function earS(px, y, z) {
  const c = Math.cos(.32), s = Math.sin(.32), dx = px - .1, dz = z + .068, u = dx * c - dz * s, w = dx * s + dz * c, ey = y - 1.845;
  let d = S.cone(u, ey, w * 2.2, 0, 0, 0, .02, .165, 0, .066, .014);
  const inner = S.cone(u, ey, (w - .034) * 2.2, .002, .018, 0, .02, .15, 0, .05, .005);
  d = S.smax(d, -inner, .01) / 1.5;
  d = S.smin(d, S.cone(px, y, z, .117, 1.99, -.074, .11, 2.04, -.082, .014, .003), .005);     // tufts
  d = S.smin(d, S.cone(px, y, z, .121, 1.99, -.074, .128, 2.035, -.08, .013, .003), .005);
  return [d, inner];
}
const earT = trim((x, y, z) => earS(Math.abs(x), y, z)[0], { front: 'ears', k: .004 });
const earF = (x, y, z) => { const px = Math.abs(x); return Math.min(earT(x, y, z), S.cone(px, y, z, .118, 1.975, -.074, .112, 2.045, -.084, .012, .0025), S.cone(px, y, z, .121, 1.975, -.074, .129, 2.04, -.08, .011, .0025), S.cone(px, y, z, .12, 1.97, -.074, .12, 2.055, -.09, .01, .0025)); };
/* ---------- tail: the side-view outline, inflated into one bold clean shape ---------- */
const tailD = RD.sdf('side', 'tail');
function tailF(x, y, z) {
  const d = tailD(z, y), R = .2, T = .18 * (.55 + .45 * Math.sin(Math.PI * S.clamp((y - .72) / 1.02, 0, 1))) * (1 + .06 * Math.sin(y * 13 + z * 9));      // a plume: fullest mid-way, slimmer at root and curl
  if (d > 0) return Math.hypot(d, Math.max(0, Math.abs(x) - .01)) * .8;
  const q = 1 - Math.min(-d, R) / R; return Math.max(d, Math.abs(x) - T * Math.sqrt(1 - q * q) - .012) * .8;
}
const tailRoot = (x, y, z) => S.cone(x, y, z, 0, .86, -.14, 0, .88, -.34, .07, .09);
/* ---------- cloak (back, up to the hood) and cape (front and shoulders, with hood) ---------- */
const cloakR = (y, th) => .182 - .06 * S.ss(1.32, 1.5, y) + (1.45 - y) * .05 + (.016 * Math.sin(th * 5 + y * 1.5) + .008 * Math.sin(th * 11 - y * 3)) * S.clamp((1.42 - y) * 1.2, 0, 1);
function cloakS(x, y, z) {
  const qx = x * .7, qz = z - BZ, r = Math.hypot(qx, qz), th = Math.atan2(qx, -qz), R = cloakR(y, th);
  const bot = .4 + .09 * Math.pow(Math.abs(Math.sin(th * 2.6 + .4)), 2) + .05 * Math.sin(th * 1.3 + 1) + .03 * Math.pow(Math.abs(Math.sin(th * 7.5)), 3);
  return Math.max(Math.abs(r - R) - .011, bot - y, y - 1.52, (Math.abs(th) - 1.35) * r) * .7;
}
const cloakW = makeWarp(cloakS, { b: [0, .36, -.4, .42, 1.5, .1], front: { view: 'back', parts: ['cloak', 'cape', 'sleeves'], mode: 'outer', ymax: 1.3 }, side: { parts: ['cloak', 'cape'], mode: 'back', pivot: BZ, ymax: 1.25 }, smooth: 4 });
const CAPE = (px, y, z) => S.ell(px, y, z, 0, 1.15, BZ, .29, .47, .2);
function capeS(x, y, z) {
  const px = Math.abs(x), th = Math.atan2(x, z - BZ);
  const bot = Math.max(1.225 - .02 * Math.abs(Math.sin(th)) + .022 * Math.pow(Math.abs(Math.sin(th * 4 + 1)), 2), z > BZ ? 1.47 - px * .62 - px * px * 1.3 : 0);
  let d = Math.max(Math.abs(CAPE(px, y, z) + .004 * Math.sin(th * 8 + y * 9)) - .009, bot - y, y - 1.6);
  if (z > BZ + .02) d = Math.max(d, (y - 1.475 - px * .8) * .6);
  return d;
}
function hoodS(x, y, z) {               // thick roll round the neck, dipping to the clasp, and the cowl hanging on the back
  const cy = 1.6 - Math.max(0, z - BZ + .1) * .5;
  const roll = Math.hypot(Math.hypot(x * .95, (z - BZ + .01) * 1.02) - .118, (y - cy) * .9) - .05;
  const cowl = S.smin(S.ell(x, y, z, 0, 1.49, -.215, .165, .15, .1), S.cone(x, y, z, 0, 1.42, -.26, 0, 1.16, -.29, .115, .014), .06);
  return S.smin(roll, cowl, .04);
}
const capeW = makeWarp(capeS, { b: [0, 1.15, -.36, .4, 1.68, .2], front: { parts: ['cape'], mode: 'outer' }, side: { parts: ['cape'], mode: 'back', pivot: BZ }, smooth: 3 });
/* ---------- torso ---------- */
const hemY = th => .69 - .03 * Math.max(0, Math.cos(th)) + .045 * Math.pow(Math.abs(Math.sin(th * 2.5 + .5)), 2) + .02 * Math.pow(Math.abs(Math.sin(th * 6.5 + 1)), 3);
function tunicS(x, y, z) {
  const px = Math.abs(x), zz = z - BZ;
  let d = S.smin(S.ell(px, y, zz, 0, 1.3, .01, .172, .19, .14), S.ell(px, y, zz, 0, 1.1, .015, .152, .16, .145), .06);
  d = S.smin(d, S.ell(px, y, zz, .14, 1.38, 0, .07, .05, .07), .05);
  const r = Math.hypot(x, (zz - .01) * 1.08), ds = (r - (.156 + (1.05 - y) * .15)) * .8, th = Math.atan2(x, zz);
  return S.smin(d, Math.max(Math.abs(ds + .01) - .01, y - 1.05, hemY(th) - y), .02);
}
const tunicW = makeWarp(tunicS, { b: [0, .66, -.26, .3, 1.5, .16], front: { parts: ['tunic', 'belt', 'pendant'], mode: 'sym', ymax: 1.28 }, side: { parts: ['tunic', 'belt'], mode: 'front', pivot: BZ, ymax: 1.34 }, smooth: 3 });
const beltR = (x, z) => Math.hypot(x, (z - BZ - .015) * 1.06);
function beltS(x, y, z) {
  const r = beltR(x, z); let d = Math.max(Math.abs(r - .166) - .011, Math.abs(y - 1.055) - .034);
  d = Math.min(d, Math.max(Math.abs(r - .181) - .009, Math.abs(y - .985 - x * .26) - .021));                                           // second belt, crossing diagonally
  return Math.min(d, Math.max(S.box(x, y, z, .075, .93, BZ + .17, .017, .06, .01, .006), .875 - y + Math.abs(x - .075) * 1.2));        // hanging strap end, pointed
}
function buckleS(x, y, z) {              // D-buckle with prong
  const zf = z - (BZ + .178), ring = Math.abs(Math.hypot(Math.max(0, x - .012) * 1.0, y - 1.055) - .034) - .0075, bar = S.box(x, y, 0, .012, 1.055, 0, .0075, .041, 1);
  return Math.max(Math.min(Math.max(ring, .012 - x - .0075), bar, S.box(x, y, 0, .03, 1.055, 0, .024, .006, 1)), Math.abs(zf) - .008);
}
const pendS = (x, y, z) => { const a = Math.atan2(x, y - 1.312), r = Math.hypot(x * 1.3, y - 1.312); return Math.max((r - .034 - .007 * Math.pow(Math.abs(Math.cos(a * 3.5)), 1.5)) * .7, Math.abs(z - .1) - .009); };
const DG = { p: [.158, 1.118, .002], g0: [.162, 1.098, -.001], g1: [.171, .992, -.018], t: [.282, .648, -.085] };   // pommel, grip ends, blade tip
function daggerS(x, y, z) {              // ring pommel, wrapped grip, crossguard, straight double-edged blade; hangs from a leather frog
  const px = Math.abs(x);
  let d = Math.max(Math.abs(Math.hypot(px - DG.p[0], y - DG.p[1] - .006) - .02) - .0075, Math.abs(z - DG.p[2]) - .007);
  d = Math.min(d, S.cone(px, y, z, DG.g0[0], DG.g0[1], DG.g0[2], DG.g1[0], DG.g1[1], DG.g1[2], .0155, .0145) - .002 * Math.sin(y * 330));
  d = Math.min(d, S.cone(px, y, z, .124, .996, -.014, .218, .966, -.03, .0095, .0095), S.sph(px, y, z, .122, .997, -.014, .013), S.sph(px, y, z, .22, .965, -.03, .013));
  const ax = DG.t[0] - DG.g1[0], ay = DG.t[1] - (DG.g1[1] - .014), az = DG.t[2] - DG.g1[2], L = Math.hypot(ax, ay, az), ux = ax / L, uy = ay / L, uz = az / L;
  const rx = px - DG.g1[0], ry = y - (DG.g1[1] - .014), rz = z - DG.g1[2], t = rx * ux + ry * uy + rz * uz, cx = rx - ux * t, cy = ry - uy * t, cz = rz - uz * t;
  const wd = Math.hypot(cx, cy), th = Math.abs(cz), w = .028 * (t < L * .72 ? 1 : 1 - (t - L * .72) / (L * .28));        // width across the blade, thickness through it
  d = Math.min(d, Math.max(wd * .55 + th * 1.3 - w * .55, -t, t - L) * .8);
  return Math.min(d, S.box(px, y, z, .168, 1.03, -.036, .03, .046, .009, .007));                                               // frog
}
/* ---------- arms ---------- */
const SH = [.17, 1.36, -.09], EL = [.3, 1.15, -.12], WR = [.325, .95, -.105];
const sleeveS = (x, y, z) => { const px = Math.abs(x); return S.smin(S.cone(px, y, z, SH[0], SH[1], SH[2], EL[0], EL[1], EL[2], .05, .062), S.sph(px, y, z, .298, 1.155, -.12, .066), .03) + .0045 * Math.sin(y * 52 - px * 30) * S.ss(1.3, 1.2, y); };
const sleeveW = makeWarp(sleeveS, { b: [.08, 1.06, -.22, .42, 1.46, 0], front: { parts: ['sleeves'], mode: 'pair', ymax: 1.27 }, side: { mode: 'round' } });
const bracerS = (x, y, z) => { const t = S.clamp((1.15 - y) / .2, 0, 1); return S.cone(Math.abs(x), y, z, .3, 1.15, -.12, WR[0], WR[1], WR[2], .058, .046) - .006 * (S.ss(.14, .06, t) + S.ss(.86, .94, t)); };
const bracerW = makeWarp(bracerS, { b: [.2, .92, -.2, .42, 1.18, -.02], front: { parts: ['bracers'], mode: 'pair' }, side: { mode: 'round' } });
const HZ = -.09;
const THUMB = (px, y, z) => Math.min(S.cone(px, y, z, .296, .9, HZ + .03, .282, .845, HZ + .05, .017, .015), S.cone(px, y, z, .282, .845, HZ + .05, .292, .795, HZ + .052, .015, .01));
const KNUCK = [[.305, .012], [.325, .0], [.345, -.012]];                // finger breaks: x at the knuckle line, x drift toward the tips
function handS(x, y, z) {                    // relaxed, loosely closed hand as drawn: broad back, thumb in front, fingers curled together to a tapered tip
  const px = Math.abs(x); let d = S.ell(px, y, z, .322, .86, HZ, .05, .085, .04);
  d = S.smin(d, S.cone(px, y, z, .322, .86, HZ, .31, .745, HZ + .012, .045, .016), .02);
  d = S.smin(d, S.cone(px, y, z, .32, .96, -.103, .322, .91, HZ, .04, .04), .02);
  for (const [kx, dx] of KNUCK) d = S.smax(d, -Math.max(Math.abs(px - (kx + (dx - .012) * S.clamp((.845 - y) / .11, 0, 1))) - .0028, y - .81), .002);      // fingers separated from the knuckles down
  return Math.min(d, THUMB(px, y, z));
}
const handF = trim(handS, { front: 'hands', k: .005 });
/* ---------- legs ---------- */
function trouserS(x, y, z) {
  const px = Math.abs(x); let d = S.ell(px, y, z, 0, .83, BZ, .185, .13, .15);
  d = S.smin(d, S.cone(px, y, z, .1, .78, -.05, .145, .53, -.05, .108, .094), .05); d = S.smin(d, S.ell(px, y, z, .15, .425, -.085, .088, .11, .105), .05);
  d = S.smin(d, S.cone(px, y, z, .137, .335, -.125, .136, .29, -.13, .056, .05), .03) + .006 * Math.sin(y * 48 + px * 26 + z * 14) * S.ss(.66, .44, y) * S.ss(.3, .36, y);
  return Math.min(d, Math.hypot(Math.hypot(px - .136, z + .128) - .054, y - .312) - .012);     // cuff band
}
const trouserW = makeWarp(trouserS, { b: [0, .27, -.28, .34, .98, .14], front: { parts: ['trousers'], mode: 'pair', ymax: .7 }, side: { parts: ['trousers'], mode: 'front', pivot: BZ, ymax: .7 }, smooth: 3 });
/* slender tapering shank leaning onto long toes; no heel on the ground */
const TOES = [[.146, .056], [.2, .086], [.26, .086], [.316, .058]], BALL = [.215, .04, -.01];
const clawD = (px, y, z) => { let m = 9; for (const [tx, tz] of TOES) { const ex = tx + (tx - BALL[0]) * .3, ez = tz + .028; m = Math.min(m, S.cone(px, y, z, tx, .02, tz, ex, -.004, ez, .009, .0015)); } return m; };
function legS(x, y, z) {
  const px = Math.abs(x); let d = S.cone(px, y, (z + .1) * .72 - .1, .11, .34, -.14, .158, .1, -.085, .04, .036);                 // shank
  d = S.smin(d, S.cone(px, y, z, .158, .1, -.085, BALL[0], BALL[1], BALL[2], .04, .04), .03);                                        // instep
  d = S.smin(d, S.ell(px, y, z, BALL[0], .042, -.02, .07, .036, .045), .02);                                                         // broad paw
  for (const [tx, tz] of TOES) d = S.smin(d, S.cone(px, y, z, BALL[0] + (tx - BALL[0]) * .3, .04, BALL[2] - .005, tx, .02, tz + .012, .021, .0135), .0025);
  return Math.max(Math.min(d, clawD(px, y, z)), -y - .006);
}
const legT = trim(legS, { front: 'lowerleg', k: .006 });
const legF = legT;
/* daggers held in the fists (shown instead of the hip daggers when a pose sets drawn) */
function drawnDaggerS(x, y, z) {
  const px = Math.abs(x), cx = .322, cy = .835, z0 = HZ; let d = S.cone(px, y, z, cx, cy, z0 - .05, cx, cy, z0 + .05, .0145, .0145);
  d = Math.min(d, Math.max(Math.abs(Math.hypot(px - cx, z - (z0 - .068)) - .0155) - .0065, Math.abs(y - cy) - .0065), S.cone(px, y, z, cx, cy - .05, z0 + .056, cx, cy + .05, z0 + .056, .0095, .0095));
  const t = z - (z0 + .06), L = .36, w = .028 * (t < L * .72 ? 1 : 1 - (t - L * .72) / (L * .28));
  return Math.min(d, Math.max(Math.abs(y - cy) * .55 + Math.abs(px - cx) * 1.3 - w * .55, -t, t - L) * .8);
}
const A = (W_, g) => W_.apply(g);
/* c: up to three flat colours; mk: marking fields that switch to colour 2 / 3 where positive; mkLine: ink the edge of marking 1 */
const PARTS = [
  { name: 'tail', b: [-.24, .7, -.82, .24, 1.76, -.1], h: .0075, f: (x, y, z) => Math.min(tailF(x, y, z), tailRoot(x, y, z)), c: [COL.fur] },
  { name: 'cloak', b: [-.44, .34, -.42, .44, 1.54, .16], h: .0065, f: cloakW.f, c: [COL.cloak] },
  { name: 'trousers', b: [-.34, .26, -.3, .34, 1.0, .16], h: .007, f: trouserW.f, c: [COL.trou] },
  { name: 'shins', gid: 13, b: [-.3, .07, -.3, .3, .38, .04], h: .0045, f: (x, y, z) => Math.max(legF(x, y, z), .092 - y), c: [COL.fur] },
  { name: 'feet', gid: 13, b: [-.38, -.01, -.2, .38, .14, .16], h: .003, f: (x, y, z) => Math.max(legF(x, y, z), y - .118), c: [COL.fur, COL.claw], mk: (x, y, z) => [.0025 - clawD(Math.abs(x), y, z), -1] },
  { name: 'tunic', b: [-.3, .64, -.28, .3, 1.5, .18], h: .0065, f: tunicW.f, c: [COL.green, COL.cream], mkLine: 1, mk: (x, y, z) => [Math.min(.066 + .012 * S.ss(1.02, .8, y) - .01 * S.ss(1.25, 1.05, y) * S.ss(.95, 1.05, y) - Math.abs(x), (z - BZ) * .6), -1] },
  { name: 'belt', b: [-.3, .86, -.28, .3, 1.14, .18], h: .0045, f: A(tunicW, beltS), c: [COL.belt] },
  { name: 'buckle', pid: 'belt', gid: 20, b: [-.04, 1.0, .06, .09, 1.11, .2], h: .0025, f: A(tunicW, buckleS), c: [COL.steel] },
  { name: 'pendant', b: [-.06, 1.26, .04, .06, 1.37, .16], h: .003, f: A(tunicW, pendS), c: [COL.pend, COL.leather], mk: (x, y, z) => [.003 - Math.abs(x), -1] },
  { name: 'daggers', b: [-.34, .63, -.18, .34, 1.15, .03], h: .0025, f: daggerS, c: [COL.steel, COL.leather], mk: (x, y, z) => { const px = Math.abs(x); return [Math.max(.003 - (S.cone(px, y, z, DG.g0[0], DG.g0[1], DG.g0[2], DG.g1[0], DG.g1[1], DG.g1[2], .0155, .0145) - .002), .002 - S.box(px, y, z, .168, 1.03, -.036, .03, .046, .009, .007)), -1]; } },
  { name: 'drawn', pid: 'daggers', gid: 8, hidden: 1, b: [-.36, .78, -.18, .36, .9, .35], h: .0028, f: drawnDaggerS, c: [COL.steel, COL.leather], mk: (x, y, z) => [Math.min(z - (HZ - .05), HZ + .05 - z), -1] },
  { name: 'hands', b: [-.42, .7, -.16, .42, .98, .0], h: .0032, f: handF, c: [COL.fur] },
  { name: 'sleeves', b: [-.42, 1.04, -.24, .42, 1.48, .02], h: .006, f: sleeveW.f, c: [COL.cream] },
  { name: 'bracers', b: [-.44, .9, -.22, .44, 1.2, 0], h: .005, f: bracerW.f, c: [COL.leather] },
  { name: 'cape', b: [-.4, 1.12, -.4, .4, 1.72, .2], h: .006, f: capeW.f, c: [COL.cloak] },
  { name: 'hood', pid: 'cape', gid: 24, b: [-.3, 1.1, -.42, .3, 1.72, .16], h: .006, f: hoodS, c: [COL.cloak] },
  { name: 'clasp', pid: 'cape', gid: 23, b: [-.04, 1.43, .08, .04, 1.5, .16], h: .003, f: (x, y, z) => S.ell(x, y, z, 0, 1.467, .118, .02, .02, .012), c: [COL.steel] },
  { name: 'throat', pid: 'head', gid: 22, b: [-.14, 1.38, -.14, .14, 1.68, .12], h: .004, f: throatF, c: [COL.white, COL.fur], mk: (x, y, z) => [-.02 - z - (y - 1.5) * .12, -1] },
  { name: 'head', b: [-.22, 1.58, -.22, .22, 1.96, .27], h: .004, f: headF, c: [COL.fur, COL.white, COL.white],
    mk(x, y, z) { const px = Math.abs(x), e = eyeLocal(px, y, z);
      const pad = Math.min(.046 - Math.hypot(px - .034, (y - 1.686) * 1.25), z - .1), chin = Math.min(.058 - Math.hypot(px, (y - 1.65) * 1.5), z - .06);
      return [Math.max(pad, chin), 1 - Math.hypot((e[0] - .006) / .07, (e[1] + .004) / .046)]; } },
  { name: 'eyes', pid: 'head', gid: 17, b: [-.14, 1.72, .02, .14, 1.83, .14], h: .003, f: eyeF, c: [COL.eye, hex('#ffffff'), COL.iris],
    mk(x, y, z) { const px = Math.abs(x), e = eyeLocal(px, y, z); return [.0055 - Math.hypot(e[0] + .009, e[1] - .008), Math.hypot(e[0], e[1] + .004) - .024]; } },
  { name: 'nose', pid: 'head', gid: 18, b: [-.05, 1.65, .17, .05, 1.73, .24], h: .0028, f: noseF, c: [COL.nose] },
  { name: 'ears', b: [-.2, 1.82, -.16, .2, 2.06, .02], h: .0035, f: earF, c: [COL.fur, COL.ear], mk: (x, y, z) => [.016 - earS(Math.abs(x), y, z)[1], -1] }
];
const GUIDES = [0, 1.05, 1.5, 1.89];
/* thin drawn lines that sit on the surface: [points, radius, bone]; mirrored left/right */
const LINES = [
  [[[.045, 1.692, .2], [.1, 1.698, .175], [.16, 1.69, .12]], .0011], [[[.048, 1.682, .198], [.105, 1.676, .17], [.165, 1.655, .12]], .0011], [[[.045, 1.672, .195], [.095, 1.655, .17], [.145, 1.625, .125]], .0011],   // whiskers
  [[[0, 1.671, .224], [.009, 1.657, .2205], [.022, 1.652, .2115], [.036, 1.659, .196], [.044, 1.667, .182]], .0021],                                       // mouth: a small Y under the nose
  [[[.012, 1.44, .075], [.02, 1.39, .098], [.006, 1.348, .104]], .0026, 'chest'],                                                    // pendant cord
  [[[.052, 1.822, .124], [.082, 1.832, .106], [.118, 1.826, .07]], .0024, 'brow'], [[[.07, 1.838, .11], [.095, 1.846, .093], [.122, 1.84, .066]], .0016, 'brow']     // brow strokes
];
