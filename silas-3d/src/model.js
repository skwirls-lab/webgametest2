/* ===== SILAS — sculpted in bind pose. Units: feet at y=0, ear tips ~2.0, facing +z.
   Proportions measured from the reference model sheet. ===== */
const COL = {
  fur: hex('#8d8a8e'), furD: hex('#6a676d'), furL: hex('#b3b1b6'), white: hex('#ebe8e4'), cloak: hex('#a66a31'), cloakD: hex('#7a4821'), green: hex('#5b7d4e'), greenD: hex('#4a6a44'),
  cream: hex('#cbbd95'), leather: hex('#623f27'), leatherD: hex('#43291a'), belt: hex('#54341f'), trou: hex('#48423a'), steel: hex('#cfd8ea'), ear: hex('#a98088'), nose: hex('#6e4a52'),
  eye: hex('#14111b'), pend: hex('#8a5a2e'), ink: hex('#0b0a12'), claw: hex('#2a2732'), dirt: hex('#6f6a45')
};
const HY = 1.69, HZ = .03, HK = .86;     // head centre + head scale
function earD(px, ly, lz) {
  const ex = px - .1, ey = ly - .12, ez = (lz + .04) * 2.3;
  let d = S.cone(ex, ey, ez, 0, 0, 0, .04, .26, 0, .08, .012);
  const inner = S.cone(ex, ey, ez - .1, .004, .01, 0, .04, .24, 0, .064, .004);
  d = S.smax(d, -inner, .012) / 1.6;
  d = S.smin(d, S.cone(px, ly, lz, .136, .36, -.05, .15, .5, -.07, .02, .002), .012);
  d = S.smin(d, S.cone(px, ly, lz, .13, .35, -.055, .118, .47, -.085, .016, .002), .012);
  return [d, inner];
}
const EYE = (px, ly, lz) => S.ell(px, ly, lz, .112, .025, .125, .05, .044, .04);
const MOUTH = (px, ly, lz) => Math.min(S.cone(px, ly, lz, 0, -.08, .31, 0, -.11, .29, .001, .001), S.cone(px, ly, lz, 0, -.11, .29, .042, -.127, .245, .001, .001), S.cone(px, ly, lz, .042, -.127, .245, .074, -.116, .185, .001, .001));
function headL(px, ly, lz) {
  let d = S.ell(px, ly, lz, 0, .01, -.02, .19, .18, .2);
  d = S.smin(d, S.ell(px, ly, lz, .095, -.07, .04, .13, .105, .13), .07);                    // cheeks
  d = S.smin(d, S.cone(px, ly, lz, 0, -.035, .1, 0, -.066, .25, .115, .058), .08);           // muzzle
  d = S.smin(d, S.ell(px, ly, lz, 0, -.125, .09, .09, .05, .11), .05);                        // jaw
  d = S.smin(d, S.ell(px, ly, lz, .075, .075, .1, .07, .03, .06), .04);                       // brow
  d = S.smin(d, S.cone(px, ly, lz, .15, -.08, .0, .25, -.15, -.05, .055, .004), .03);         // cheek ruff
  d = S.smin(d, S.cone(px, ly, lz, .13, -.13, .01, .2, -.23, -.02, .048, .004), .03);
  d = S.smin(d, S.cone(px, ly, lz, 0, -.1, -.03, 0, -.34, -.02, .12, .125), .05);              // neck
  d = S.smin(d, S.cone(px, ly, lz, 0, -.2, .07, .04, -.33, .1, .07, .01), .04);               // chest fluff
  d = S.smin(d, earD(px, ly, lz)[0], .022);
  d = S.smax(d, -(EYE(px, ly, lz) - .004), .012);
  return S.smax(d, -(MOUTH(px, ly, lz) - .006), .006);
}
const headF = (x, y, z) => headL(Math.abs(x) / HK, (y - HY) / HK, (z - HZ) / HK) * HK;
function headC(x, y, z) {
  const px = Math.abs(x) / HK, ly = (y - HY) / HK, lz = (z - HZ) / HK;
  if (MOUTH(px, ly, lz) < .009) return COL.ink;
  if (ly > .1 && earD(px, ly, lz)[1] < .02) return COL.ear;
  const e = EYE(px, ly, lz); if (e < .009) return COL.ink;
  if (S.cone(px, ly, lz, .06, .1, .17, .17, .085, .09, .001, .001) < .012) return COL.furD;   // brow line
  const yb = -.045 - .02 * S.ss(0, .2, px) + .012 * Math.sin(px * 95) + .008 * Math.sin(lz * 80);
  if (ly < yb && lz > -.06 + px * .35 + (ly < -.2 ? .04 : 0)) return COL.white;
  if (e < .03) return COL.furL;
  return COL.fur;
}
function tailPath() {
  const C = [[0, .9, -.1], [0, .74, -.3], [0, .78, -.52], [0, 1.14, -.64], [0, 1.5, -.58], [0, 1.74, -.44], [0, 1.82, -.6], [0, 1.7, -.72]], out = [], n = 30, m = C.length - 1;
  for (let k = 0; k <= n; k++) {
    const u = k / n * m, i = Math.min(m - 1, Math.floor(u)), f = u - i, p0 = C[Math.max(0, i - 1)], p1 = C[i], p2 = C[i + 1], p3 = C[Math.min(m, i + 2)];
    const q = d => .5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * f + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * f * f + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * f * f * f);
    const t = k / n; out.push([q(0), q(1), q(2), .035 + .12 * Math.pow(Math.sin(Math.PI * Math.pow(t, 1.15)), .8)]);
  }
  return out;
}
const TAIL = tailPath();
const tuft = (x, y, z) => Math.sin(x * 52 + Math.sin(y * 7) * 2) * Math.sin(y * 19 - z * 25 + Math.sin(x * 9));
function tailF(x, y, z) {
  let d = 9; for (const s of TAIL) d = S.smin(d, S.sph(x, y, z, s[0], s[1], s[2], s[3]), .05);
  return d - .012 * tuft(x, y, z);
}
const cloakR = (y, th) => .185 - .07 * S.ss(1.3, 1.44, y) + (1.42 - y) * .05 + .014 * Math.sin(th * 7 + y * 2) * S.clamp((1.3 - y) * 1.4, 0, 1);
function cloakF(x, y, z) {
  const qx = x * .66, qz = z + .01, r = Math.hypot(qx, qz), th = Math.atan2(qx, -qz), R = cloakR(y, th);
  const bot = .36 + .08 * Math.abs(Math.sin(th * 5.3 + .4)) + .05 * Math.sin(th * 2.1 + 1) + .03 * Math.abs(Math.sin(th * 13));
  let d = Math.max(Math.abs(r - R) - .011, bot - y, y - 1.44, (Math.abs(th) - 1.3) * r);
  d = Math.max(d, -S.sph(x, y, z, .13, .56, -.3, .035), -S.sph(x, y, z, -.19, .7, -.26, .028));
  return d * .7;
}
/* shoulder cape + collar + hood hanging behind the neck */
const capeBot = th => 1.24 - .13 * Math.abs(Math.sin(th)) + .03 * Math.abs(Math.sin(th * 6 + 1)) + .015 * Math.sin(th * 15);
function capeF(x, y, z) {
  const px = Math.abs(x), th = Math.atan2(x, z);
  const e = S.ell(px, y, z, 0, 1.17, -.01, .345, .35, .215);
  let d = Math.max(Math.abs(e) - .009, capeBot(th) - y, y - 1.505);
  if (z > 0) d = Math.max(d, ((1.47 - y) * .5 - px) * .7);                                     // V opening at the chest
  d = S.smin(d, Math.hypot(Math.hypot(x * .95, z * 1.05) - .105, (y - 1.485) * 1.2) - .034, .03);   // collar roll
  let h = S.smin(S.ell(x, y, z, 0, 1.45, -.17, .14, .11, .085), S.cone(x, y, z, 0, 1.4, -.2, 0, 1.17, -.225, .1, .012), .06);
  h = S.smax(h, -S.ell(x, y, z, 0, 1.5, -.15, .095, .07, .06), .02);
  return S.smin(d, h, .03);
}
const hemY = th => .64 + .04 * Math.abs(Math.sin(th * 4.5 + .5)) + .02 * Math.sin(th * 11) + .012 * Math.sin(th * 23);
function tunicF(x, y, z) {
  const px = Math.abs(x);
  let d = S.smin(S.ell(px, y, z, 0, 1.3, 0, .17, .18, .122), S.ell(px, y, z, 0, 1.09, 0, .152, .16, .116), .06);
  d = S.smin(d, S.ell(px, y, z, .14, 1.37, 0, .065, .05, .065), .05);
  const r = Math.hypot(x, z * 1.25), ds = (r - (.156 + (1.0 - y) * .16)) * .8, th = Math.atan2(x, z);
  d = S.smin(d, Math.max(Math.abs(ds + .01) - .01, y - 1.0, hemY(th) - y), .02);
  if (z > 0) d = Math.max(d, -(Math.abs(px - .07) - .004));
  return d;
}
function tunicC(x, y, z) {
  const px = Math.abs(x), th = Math.atan2(x, z);
  if (z > 0 && Math.abs(px - .07) < .0065) return COL.ink;
  const dirt = y < hemY(th) + .035 + .02 * Math.sin(th * 9);
  if (z > 0 && px < .07) return dirt ? [COL.cream[0] * .82, COL.cream[1] * .78, COL.cream[2] * .64] : COL.cream;
  return dirt ? COL.dirt : COL.green;
}
const SH = [.2, 1.35, 0], EL = [.292, 1.14, -.012], WR = [.326, .905, .03];
const PARTS = [
  { name: 'tail', b: [-.24, .5, -.92, .24, 2.0, .02], h: .009, f: tailF, frost: 1, col: (x, y, z) => tuft(x, y, z) < -.72 ? COL.furD : COL.fur },
  { name: 'cloak', b: [-.44, .3, -.38, .44, 1.46, .2], h: .0065, f: cloakF, col: (x, y, z) => { const th = Math.atan2(x * .66, -(z + .01)); return Math.hypot(x * .66, z + .01) < cloakR(y, th) - .002 ? COL.cloakD : COL.cloak; } },
  { name: 'trousers', b: [-.32, .26, -.2, .32, 1.0, .2], h: .0075, col: () => COL.trou, f(x, y, z) {
      const px = Math.abs(x); let d = S.ell(px, y, z, 0, .88, 0, .168, .11, .125);
      d = S.smin(d, S.cone(px, y, z, .092, .84, 0, .122, .57, .025, .098, .084), .05); d = S.smin(d, S.ell(px, y, z, .13, .44, .012, .09, .12, .092), .05);
      return S.smin(d, S.cone(px, y, z, .135, .335, .0, .136, .3, -.002, .056, .052), .03) + .004 * Math.sin(y * 60 + px * 30) * S.ss(.62, .42, y);
    } },
  { name: 'legs', b: [-.3, -.01, -.16, .3, .36, .32], h: .006, f(x, y, z) {
      const px = Math.abs(x); let d = S.cone(px, y, z, .136, .33, 0, .148, .1, -.045, .043, .034);
      d = S.smin(d, S.ell(px, y, z, .152, .042, .05, .054, .042, .135), .04);
      for (const [ox, len] of [[-.04, .215], [-.014, .245], [.014, .245], [.04, .22]]) d = S.smin(d, S.cone(px, y, z, .152 + ox * .7, .034, .12, .152 + ox * 1.3, .02, len, .018, .01), .016);
      return Math.max(d, -y);
    }, col: (x, y, z) => z > .222 && y < .04 ? COL.claw : COL.fur },
  { name: 'tunic', b: [-.3, .6, -.24, .3, 1.52, .24], h: .0065, f: tunicF, col: tunicC },
  { name: 'belts', b: [-.28, .86, -.2, .28, 1.06, .2], h: .005, col: (x, y, z) => (z > .1 && Math.abs(x) < .03 && y > .97) ? COL.steel : COL.belt, f(x, y, z) {
      const r = Math.hypot(x, z * 1.25); let d = Math.max(Math.abs(r - .168) - .011, Math.abs(y - 1.0) - .022);
      d = Math.min(d, Math.max(Math.abs(r - .19) - .009, Math.abs(y - .945 - x * .2) - .017));
      return Math.min(d, S.box(x, y, z, 0, 1.0, .148, .027, .029, .008, .004));
    } },
  { name: 'daggers', b: [-.34, .58, -.04, .34, 1.06, .18], h: .004, f(x, y, z) {
      const px = Math.abs(x); let d = S.cone(px, y, z, .192, 1.03, .05, .208, .945, .062, .017, .016);
      d = Math.min(d, S.sph(px, y, z, .19, 1.04, .049, .021), S.box(px, y, z, .21, .934, .064, .012, .009, .042, .005));
      const t = S.clamp((.93 - y) / .31, 0, 1), cx = .212 + t * .05, cz = .066 + t * .02;
      return Math.min(d, Math.max(Math.abs(px - cx) * 2.4 + Math.abs(z - cz) - .036 * (1 - t * .96), y - .93, .62 - y) * .5);
    }, col: (x, y, z) => y > .944 ? (y > 1.02 ? COL.steel : COL.leatherD) : COL.steel },
  { name: 'hands', b: [-.42, .7, -.04, .42, .92, .14], h: .0045, f(x, y, z) {
      const px = Math.abs(x); let d = S.ell(px, y, z, .332, .845, .04, .033, .052, .042);
      for (const [oz, len] of [[-.03, .06], [-.01, .074], [.012, .074], [.033, .062]]) d = S.smin(d, S.cone(px, y, z, .334, .815, .04 + oz, .326, .81 - len, .04 + oz * 1.25, .0145, .009), .012);
      return S.smin(d, S.cone(px, y, z, .318, .85, .068, .3, .79, .096, .015, .009), .012);
    }, col: (x, y, z) => y < .752 ? COL.claw : COL.fur },
  { name: 'sleeves', b: [-.4, 1.04, -.12, .4, 1.5, .12], h: .006, col: () => COL.cream, f(x, y, z) {
      const px = Math.abs(x); return S.smin(S.cone(px, y, z, SH[0], SH[1], SH[2], EL[0], EL[1], EL[2], .058, .054), S.sph(px, y, z, .288, 1.15, -.01, .058), .03) + .003 * Math.sin(y * 70);
    } },
  { name: 'bracers', b: [-.42, .86, -.08, .42, 1.16, .12], h: .005, f(x, y, z) {
      const px = Math.abs(x), t = S.clamp((1.12 - y) / .21, 0, 1);
      return S.cone(px, y, z, .294, 1.12, -.01, WR[0], .91, WR[2], .055, .042) - .005 * (S.ss(.1, .0, t) + S.ss(.9, 1, t));
    }, col(x, y, z) { const px = Math.abs(x), t = (1.12 - y) / .21; if (t < .1 || t > .9) return COL.leatherD; const c = .294 + t * .032; return (px > c + .02 && Math.abs(((t * 5) % 1) - .5) < .09) ? COL.ink : COL.leather; } },
  { name: 'cape', b: [-.4, 1.08, -.3, .4, 1.56, .26], h: .006, f: capeF, col: (x, y, z) => S.ell(Math.abs(x), y, z, 0, 1.17, -.01, .345, .35, .215) < -.003 && y < 1.44 ? COL.cloakD : COL.cloak },
  { name: 'pendant', b: [-.07, 1.14, .08, .07, 1.36, .2], h: .0035, col: (x, y, z) => (Math.abs(x) < .003 || Math.abs(Math.abs(x) - (1.25 - y) * .5 - .002) < .003) && y < 1.275 ? COL.leatherD : COL.pend, f(x, y, z) {
      const px = Math.abs(x); return Math.min(Math.max((px * 1.5 + Math.abs(y - 1.235) - .048) * .6, Math.abs(z - .132) - .008), S.cone(px, y, z, 0, 1.275, .132, .04, 1.4, .1, .005, .005));
    } },
  { name: 'clasp', gloss: 1, b: [-.04, 1.42, .08, .04, 1.5, .16], h: .003, col: () => COL.steel, f: (x, y, z) => S.sph(x, y, z, 0, 1.462, .12, .017) },
  { name: 'head', b: [-.28, 1.36, -.24, .28, 2.14, .34], h: .005, f: headF, col: headC },
  { name: 'eyes', gloss: 1, b: [-.16, 1.64, .06, .16, 1.78, .2], h: .003, col: () => COL.eye, f: (x, y, z) => EYE(Math.abs(x) / HK, (y - HY) / HK, (z - HZ) / HK - .004) * HK },
  { name: 'nose', gloss: 1, b: [-.05, 1.6, .24, .05, 1.7, .34], h: .003, col: () => COL.nose, f: (x, y, z) => S.ell(x / HK, (y - HY) / HK, (z - HZ) / HK, 0, -.055, .306, .034, .024, .022) * HK }
];
const GUIDES = [0, 1.0, 1.44, 1.85];
const WHISK = [-.085, .26, .25, .2];   // head-local: y, z at root; tip x, z
