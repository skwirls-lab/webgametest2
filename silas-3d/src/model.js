/* ===== SILAS — sculpted in bind pose. Units: feet at y=0, ear tips ~2.0, facing +z.
   Every landmark below was measured off the reference model sheet (front and side views). ===== */
const COL = {
  fur: hex('#8d8a8e'), furD: hex('#6a676d'), furL: hex('#b3b1b6'), white: hex('#ebe8e4'), cloak: hex('#a66a31'), cloakD: hex('#7a4821'), green: hex('#5b7d4e'),
  cream: hex('#cbbd95'), leather: hex('#623f27'), leatherD: hex('#43291a'), belt: hex('#54341f'), trou: hex('#48423a'), steel: hex('#cfd8ea'), ear: hex('#a98088'),
  pend: hex('#8a5a2e'), ink: hex('#0b0a12'), claw: hex('#2a2732'), dirt: hex('#6f6a45')
};
function earD(px, y, z) {
  const ex = px - .095, ey = y - 1.845, ez = (z + .06) * 2.1;
  let d = S.cone(ex, ey, ez, 0, 0, 0, .024, .145, 0, .052, .009);
  const inner = S.cone(ex, ey, ez - .07, .002, .012, 0, .022, .13, 0, .038, .003);
  d = S.smax(d, -inner, .01) / 1.5;
  d = S.smin(d, S.cone(px, y, z, .12, 1.985, -.06, .127, 2.04, -.066, .011, .0015), .008);
  return [S.smin(d, S.cone(px, y, z, .114, 1.98, -.064, .108, 2.03, -.074, .009, .0015), .008), inner];
}
function headF(x, y, z) {
  const px = Math.abs(x);
  let d = S.ell(px, y, z, 0, 1.765, -.01, .135, .125, .135);
  d = S.smin(d, S.ell(px, y, z, .072, 1.715, .03, .086, .072, .09), .05);                    // cheeks
  d = S.smin(d, S.cone(px, y, z, 0, 1.737, .07, 0, 1.704, .186, .088, .04), .06);            // muzzle
  d = S.smin(d, S.ell(px, y, z, 0, 1.662, .07, .064, .04, .085), .04);                        // jaw
  d = S.smin(d, S.ell(px, y, z, .06, 1.8, .065, .05, .026, .045), .03);                       // brow
  d = S.smin(d, S.cone(px, y, z, .11, 1.71, -.01, .168, 1.672, -.04, .036, .003), .02);       // cheek ruff
  d = S.smin(d, S.cone(px, y, z, .098, 1.672, 0, .142, 1.615, -.02, .032, .003), .02);
  d = S.smin(d, S.cone(px, y, z, 0, 1.66, -.04, 0, 1.44, -.05, .088, .1), .04);               // neck
  d = S.smin(d, S.cone(px, y, z, 0, 1.61, .03, 0, 1.45, .055, .062, .03), .04);               // chest fluff
  return S.smin(d, earD(px, y, z)[0], .016);
}
const headC = (x, y, z) => (y > 1.85 && earD(Math.abs(x), y, z)[1] < .012) ? COL.ear : (y < 1.7 && z > -.02 ? COL.white : COL.fur);
function tailPath() {
  const C = [[-.2, .9], [-.36, .9], [-.47, .95], [-.47, 1.12], [-.44, 1.34], [-.47, 1.5], [-.57, 1.57], [-.66, 1.51], [-.7, 1.42]], out = [], n = 34, m = C.length - 1;
  for (let k = 0; k <= n; k++) {
    const u = k / n * m, i = Math.min(m - 1, Math.floor(u)), f = u - i, p0 = C[Math.max(0, i - 1)], p1 = C[i], p2 = C[i + 1], p3 = C[Math.min(m, i + 2)];
    const q = d => .5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * f + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * f * f + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * f * f * f);
    const t = k / n; out.push([q(0), q(1), .055 + .08 * S.ss(0, .2, t) - .11 * Math.pow(S.ss(.5, 1, t), 1.2)]);
  }
  return out;
}
const TAIL = tailPath();
const tuft = (x, y, z) => Math.sin(x * 52 + Math.sin(y * 7) * 2) * Math.sin(y * 19 - z * 25 + Math.sin(x * 9));
function tailF(x, y, z) {
  let d = 9; for (const s of TAIL) d = S.smin(d, S.len(x * 1.25, y - s[1], z - s[0]) - s[2], .05);
  return (d - .003 * tuft(x, y, z)) * .8;
}
const BZ = -.06;
const cloakR = (y, th) => .178 - .06 * S.ss(1.36, 1.5, y) + (1.45 - y) * .05 + .012 * Math.sin(th * 7 + y * 2) * S.clamp((1.3 - y) * 1.4, 0, 1);
function cloakF(x, y, z) {
  const qx = x * .7, qz = z - BZ, r = Math.hypot(qx, qz), th = Math.atan2(qx, -qz), R = cloakR(y, th);
  const bot = .42 + .07 * Math.abs(Math.sin(th * 5.3 + .4)) + .04 * Math.sin(th * 2.1 + 1) + .03 * Math.abs(Math.sin(th * 13));
  let d = Math.max(Math.abs(r - R) - .011, bot - y, y - 1.5, (Math.abs(th) - 1.3) * r);
  d = Math.max(d, -S.sph(x, y, z, .15, .6, -.3, .03), -S.sph(x, y, z, -.2, .72, -.28, .024));
  return d * .7;
}
const CAPE = (px, y, z) => S.ell(px, y, z, 0, 1.15, BZ, .29, .47, .2);
function capeF(x, y, z) {
  const px = Math.abs(x), th = Math.atan2(x, z - BZ);
  const bot = Math.max(1.27 - .03 * Math.abs(Math.sin(th)) + .025 * Math.abs(Math.sin(th * 6 + 1)) + .012 * Math.sin(th * 15), z > BZ ? 1.455 - px * .62 : 0);
  let d = Math.max(Math.abs(CAPE(px, y, z)) - .009, bot - y, y - 1.56);
  const cy = 1.55 - (z - BZ) * .3;                                                                // collar roll, higher at the back
  d = S.smin(d, Math.hypot(Math.hypot(x * .95, (z - BZ) * 1.05) - .118, (y - cy) * 1.1) - .036, .04);
  let h = S.smin(S.ell(x, y, z, 0, 1.5, -.21, .135, .12, .075), S.cone(x, y, z, 0, 1.44, -.24, 0, 1.25, -.262, .09, .012), .06);
  return S.smin(d, h, .04) + .004 * Math.sin(th * 11 + y * 30);
}
const hemY = th => .745 + .03 * Math.abs(Math.sin(th * 4.5 + .5)) + .016 * Math.sin(th * 11) + .01 * Math.sin(th * 23);
function tunicF(x, y, z) {
  const px = Math.abs(x), zz = z - BZ;
  let d = S.smin(S.ell(px, y, zz, 0, 1.3, .01, .172, .19, .14), S.ell(px, y, zz, 0, 1.1, .015, .152, .16, .145), .06);
  d = S.smin(d, S.ell(px, y, zz, .14, 1.4, 0, .07, .05, .07), .05);
  const r = Math.hypot(x, (zz - .01) * 1.08), ds = (r - (.156 + (1.05 - y) * .15)) * .8, th = Math.atan2(x, zz);
  d = S.smin(d, Math.max(Math.abs(ds + .01) - .01, y - 1.05, hemY(th) - y), .02);
  return d;
}
const SH = [.2, 1.4, -.07], EL = [.3, 1.15, -.1], WR = [.338, .935, -.055];
const PARTS = [
  { name: 'tail', inset: 0.035, views: [0, 1, 0], b: [-.2, .68, -.82, .2, 1.76, -.1], h: .008, f: tailF, frost: 1, col: (x, y, z) => tuft(x, y, z) < -.72 ? COL.furD : COL.fur },
  { name: 'cloak', views: [1, 1, 1], b: [-.42, .36, -.4, .42, 1.52, .16], h: .0065, f: cloakF, col: () => COL.cloak },
  { name: 'trousers', inset: 0.04, views: [1, 1, 1], b: [-.34, .26, -.26, .34, 1.0, .14], h: .0075, col: () => COL.trou, f(x, y, z) {
      const px = Math.abs(x); let d = S.ell(px, y, z, 0, .83, BZ, .185, .13, .15);
      d = S.smin(d, S.cone(px, y, z, .1, .78, -.05, .13, .53, -.04, .108, .094), .05); d = S.smin(d, S.ell(px, y, z, .134, .425, -.07, .09, .11, .1), .05);
      return S.smin(d, S.cone(px, y, z, .132, .335, -.1, .132, .3, -.1, .06, .056), .03) + .004 * Math.sin(y * 60 + px * 30) * S.ss(.62, .42, y);
    } },
  { name: 'legs', inset: 0.035, views: [1, 1, 1], b: [-.36, -.01, -.24, .36, .34, .16], h: .0055, f(x, y, z) {
      const px = Math.abs(x); let d = S.cone(px, y, z, .132, .31, -.11, .152, .13, -.135, .042, .034);
      d = S.smin(d, S.cone(px, y, z, .156, .115, -.14, .195, .03, .04, .04, .046), .03);
      for (const [tx, tz] of [[.115, .095], [.165, .115], [.215, .112], [.268, .09]]) d = S.smin(d, S.cone(px, y, z, .195, .03, .03, tx, .014, tz, .02, .011), .014);
      return Math.max(d, -y);
    }, col: () => COL.fur },
  { name: 'tunic', inset: 0.03, views: [1, 0, 0], b: [-.3, .7, -.26, .3, 1.5, .16], h: .0065, f: tunicF, col: (x, y, z) => z > BZ && Math.abs(x) < .07 ? COL.cream : COL.green },
  { name: 'belts', views: [1, 0, 0], b: [-.28, .9, -.26, .28, 1.12, .16], h: .005, col: () => COL.belt, f(x, y, z) {
      const r = Math.hypot(x, (z - BZ - .015) * 1.06); let d = Math.max(Math.abs(r - .166) - .011, Math.abs(y - 1.05) - .026);
      return Math.min(d, Math.max(Math.abs(r - .185) - .009, Math.abs(y - .99 + Math.abs(x) * .1) - .018));
    } },
  { name: 'daggers', views: [1, 0, 0], b: [-.32, .64, -.02, .32, 1.14, .16], h: .004, f(x, y, z) {
      const px = Math.abs(x); let d = S.cone(px, y, z, .128, 1.095, .08, .15, .975, .095, .017, .016);
      d = Math.min(d, S.sph(px, y, z, .126, 1.105, .079, .021), S.cone(px, y, z, .118, .975, .095, .188, .945, .095, .011, .011));
      const t = S.clamp((.96 - y) / .285, 0, 1), cx = .156 + t * .092, cz = .096 - t * .02;
      return Math.min(d, Math.max(Math.abs(px - cx - (y - .96) * 0) * 1.2 + Math.abs(z - cz) * 2.6 - .03 * (1 - t * .96), y - .962, .672 - y) * .5);
    }, col: (x, y, z) => y > .985 ? COL.leatherD : COL.steel },
  { name: 'hands', inset: 0.035, views: [1, 0, 1], b: [-.42, .7, -.14, .42, .96, .04], h: .0045, f(x, y, z) {
      const px = Math.abs(x); let d = S.ell(px, y, z, .345, .87, -.045, .036, .058, .042);
      for (const [oz, len] of [[-.032, .06], [-.011, .078], [.012, .076], [.034, .062]]) d = S.smin(d, S.cone(px, y, z, .348, .835, -.045 + oz, .352, .812 - len, -.045 + oz * 1.25, .0155, .0095), .012);
      return S.smin(d, S.cone(px, y, z, .322, .875, -.02, .305, .8, .005, .016, .0095), .012);
    }, col: () => COL.fur },
  { name: 'sleeves', inset: 0.055, views: [1, 0, 1], b: [-.4, 1.06, -.2, .4, 1.5, .04], h: .006, col: () => COL.cream, f(x, y, z) {
      const px = Math.abs(x); return S.smin(S.cone(px, y, z, SH[0], SH[1], SH[2], EL[0], EL[1], EL[2], .064, .06), S.sph(px, y, z, .298, 1.165, -.098, .064), .03) + .003 * Math.sin(y * 70);
    } },
  { name: 'bracers', inset: 0.05, views: [1, 0, 1], b: [-.44, .9, -.18, .44, 1.18, .02], h: .005, col: () => COL.leather, f(x, y, z) {
      const px = Math.abs(x), t = S.clamp((1.145 - y) / .2, 0, 1);
      return S.cone(px, y, z, .302, 1.145, -.1, WR[0], .945, WR[2], .062, .048) - .004 * (S.ss(.1, .0, t) + S.ss(.9, 1, t));
    } },
  { name: 'cape', views: [1, 1, 1], b: [-.36, 1.2, -.34, .36, 1.66, .18], h: .006, f: capeF, col: () => COL.cloak },
  { name: 'pendant', views: [1, 0, 0], b: [-.06, 1.26, .04, .06, 1.4, .14], h: .0035, col: () => COL.pend, f: (x, y, z) => Math.max((Math.abs(x) * 1.3 + Math.abs(y - 1.33) - .045) * .6, Math.abs(z - .098) - .008) },
  { name: 'head', views: [1, 1, 1], b: [-.2, 1.42, -.2, .2, 2.06, .25], h: .0045, f: headF, col: headC }
];
const GUIDES = [0, 1.05, 1.5, 1.89];
/* how each traced reference view maps to model space: px per unit, pixel column of the body axis, pixel row of the ground */
const VIEWMAP = { front: { s: 645, cx: 254.5, gy: 1306 }, side: { s: 645, cx: 490, gy: 1306 }, back: { s: 645, cx: 244.5, gy: 1290 } };
