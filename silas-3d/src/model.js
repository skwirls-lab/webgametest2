/* ===== SILAS — sculpted in bind pose. Units: feet at y=0, ear tips ~2.0, facing +z.
   Each part is a rough sculpt (blended volumes) that fit.js stretches onto the reference outlines. ===== */
const COL = {
  fur: hex('#7f7772'), furD: hex('#5f5752'), furL: hex('#c4bbb3'), white: hex('#d9d2ca'), cloak: hex('#86674a'), cloakD: hex('#5a4533'), green: hex('#565c47'),
  cream: hex('#978d77'), leather: hex('#40342c'), leatherL: hex('#665749'), belt: hex('#463b32'), trou: hex('#3b352e'), steel: hex('#9a9894'), ear: hex('#8f7f78'),
  pend: hex('#6a574a'), ink: hex('#0b0a12'), claw: hex('#1d1a17'), ring: hex('#d3cbc1'), eye: hex('#17110e'), iris: hex('#4a392b'), nose: hex('#6b524c')
};
const BZ = -.06;
/* ---------- head (landmarks measured on the front and side face crops) ---------- */
const EYE = { c: [.0875, 1.775, .0875], t: [.59, 0, -.81], n: [.81, 0, .59] };       // socket centre, long axis, outward normal
function eyeLocal(px, y, z) {            // -> [along the eye, up (tilted: inner corner lower), outward]
  const dx = px - EYE.c[0], dy = y - EYE.c[1], dz = z - EYE.c[2], u = dx * EYE.t[0] + dz * EYE.t[2], w = dx * EYE.n[0] + dz * EYE.n[2], c = Math.cos(.42), s = Math.sin(.42);
  return [u * c - dy * s, u * s + dy * c, w];
}
const socket = (px, y, z) => { const e = eyeLocal(px, y, z); return S.ell(e[0], e[1], e[2], 0, 0, 0, .047, .0235, .03); };
function headS(px, y, z) {
  let d = S.ell(px, y, z, 0, 1.79, -.01, .128, .122, .134);                                   // cranium
  d = S.smin(d, S.ell(px, y, z, .068, 1.715, .02, .096, .074, .098), .05);                    // cheeks
  d = S.smin(d, S.cone(px, y, z, 0, 1.8, .06, 0, 1.722, .185, .07, .036), .05);               // bridge: straight slope from brow to nose
  d = S.smin(d, S.cone(px, y, z, 0, 1.7, .09, 0, 1.69, .18, .068, .04), .04);                 // upper lip / whisker pads
                       // whisker pads overhang the mouth
  d = S.smin(d, S.ell(px, y, z, .068, 1.818, .078, .046, .022, .04), .03);                    // brow
  d = S.smin(d, S.cone(px, y, z, .125, 1.735, -.01, .178, 1.74, -.035, .034, .006), .02);     // cheek ruff: three bold tufts
  d = S.smin(d, S.cone(px, y, z, .125, 1.705, -.01, .174, 1.695, -.04, .034, .006), .02);
  d = S.smin(d, S.cone(px, y, z, .115, 1.675, 0, .162, 1.655, -.035, .032, .006), .02);
  d = S.smin(d, S.cone(px, y, z, 0, 1.885, -.015, 0, 1.925, -.04, .045, .008), .02);          // crown tuft
  d = S.smin(d, S.cone(px, y, z, 0, 1.67, .0, 0, 1.45, .02, .105, .095), .04);                // throat
  d = S.smin(d, S.cone(px, y, z, 0, 1.6, .04, 0, 1.45, .07, .065, .04), .04);                 // chest fluff
  return S.smax(d, -socket(px, y, z), .008);
}
const headF = trim((x, y, z) => headS(Math.abs(x), y, z), { front: 'head', side: 'head', k: .008 });
const neckF = (x, y, z) => S.cone(x, y, z, 0, 1.64, -.04, 0, 1.4, -.05, .07, .08);
const eyeC = [EYE.c[0] - EYE.n[0] * .03, EYE.c[1], EYE.c[2] - EYE.n[2] * .03];
const eyeF = (x, y, z) => S.sph(Math.abs(x), y, z, eyeC[0], eyeC[1], eyeC[2], .0365);
const noseF = (x, y, z) => Math.min(S.ell(x, y, z, 0, 1.699, .212, .03, .019, .019), S.cone(x, y, z, 0, 1.686, .221, 0, 1.662, .212, .005, .0035));
const jawF = trim((x, y, z) => S.smin(S.ell(x, y, z, 0, 1.643, .132, .04, .019, .062), S.ell(x, y, z, 0, 1.634, .1, .04, .018, .055), .02), { front: 'head', side: 'head', k: .004 });
/* ---------- ears: cupped, opening forward and outward ---------- */
function earS(px, y, z) {
  const c = Math.cos(.6), s = Math.sin(.6), dx = px - .1, dz = z + .062, u = dx * c - dz * s, w = dx * s + dz * c, ey = y - 1.855;
  let d = S.cone(u, ey, w * 2.4, 0, 0, 0, .012, .15, 0, .052, .012);
  const inner = S.cone(u, ey, (w - .03) * 2.4, .002, .016, 0, .012, .135, 0, .036, .004);
  d = S.smax(d, -inner, .01) / 1.6;
  d = S.smin(d, S.cone(px, y, z, .119, 1.99, -.07, .123, 2.035, -.076, .013, .004), .006);
  return [d, inner];
}
const earF = trim((x, y, z) => earS(Math.abs(x), y, z)[0], { front: 'ears', k: .005 });
/* ---------- tail: the side-view outline, inflated into one bold clean shape ---------- */
const tailD = RD.sdf('side', 'tail');
function tailF(x, y, z) {
  const d = tailD(z, y), R = .17, T = .135;
  if (d > 0) return Math.hypot(d, Math.max(0, Math.abs(x) - .01)) * .8;
  const q = 1 - Math.min(-d, R) / R; return Math.max(d, Math.abs(x) - T * Math.sqrt(1 - q * q) - .012) * .8;
}
const tailRoot = (x, y, z) => S.cone(x, y, z, 0, .86, -.14, 0, .88, -.34, .07, .09);
/* ---------- cloak (back) and cape (shoulders + hood) ---------- */
const cloakR = (y, th) => .178 - .05 * S.ss(1.36, 1.5, y) + (1.45 - y) * .05 + .01 * Math.sin(th * 7 + y * 2) * S.clamp((1.3 - y) * 1.4, 0, 1);
function cloakS(x, y, z) {
  const qx = x * .7, qz = z - BZ, r = Math.hypot(qx, qz), th = Math.atan2(qx, -qz), R = cloakR(y, th);
  const bot = .4 + .06 * Math.abs(Math.sin(th * 5.3 + .4)) + .035 * Math.sin(th * 2.1 + 1) + .025 * Math.abs(Math.sin(th * 13));
  return Math.max(Math.abs(r - R) - .011, bot - y, y - 1.5, (Math.abs(th) - 1.35) * r) * .7;
}
const cloakW = makeWarp(cloakS, { b: [0, .36, -.4, .42, 1.5, .1], front: { view: 'back', parts: ['cloak', 'cape'], mode: 'outer', ymax: 1.3 }, side: { parts: ['cloak', 'cape'], mode: 'back', pivot: BZ, ymax: 1.25 }, smooth: 4 });
const CAPE = (px, y, z) => S.ell(px, y, z, 0, 1.15, BZ, .29, .47, .2);
function capeS(x, y, z) {
  const px = Math.abs(x), th = Math.atan2(x, z - BZ);
  const bot = Math.max(1.225 - .02 * Math.abs(Math.sin(th)) + .02 * Math.abs(Math.sin(th * 6 + 1)), z > BZ ? 1.47 - px * .85 : 0);
  let d = Math.max(Math.abs(CAPE(px, y, z)) - .009, bot - y, y - 1.58);
  if (z > BZ + .02) d = Math.max(d, (y - 1.475 - px * .8) * .6);
  const cy = 1.6 - Math.max(0, z - BZ + .1) * .5;
  d = S.smin(d, Math.hypot(Math.hypot(x * .95, (z - BZ) * 1.05) - .118, (y - cy) * 1.1) - .036, .04);          // collar roll
  const h = S.smin(S.ell(x, y, z, 0, 1.5, -.21, .135, .12, .075), S.cone(x, y, z, 0, 1.44, -.24, 0, 1.25, -.262, .09, .012), .06);   // hood bag
  return S.smin(d, h, .04);
}
const capeW = makeWarp(capeS, { b: [0, 1.15, -.36, .4, 1.68, .2], front: { parts: ['cape'], mode: 'outer' }, side: { parts: ['cape'], mode: 'back', pivot: BZ }, smooth: 3 });
/* ---------- torso ---------- */
const hemY = th => .69 - .03 * Math.max(0, Math.cos(th)) + .04 * Math.pow(Math.abs(Math.sin(th * 3.5 + .5)), 1.5);
function tunicS(x, y, z) {
  const px = Math.abs(x), zz = z - BZ;
  let d = S.smin(S.ell(px, y, zz, 0, 1.3, .01, .172, .19, .14), S.ell(px, y, zz, 0, 1.1, .015, .152, .16, .145), .06);
  d = S.smin(d, S.ell(px, y, zz, .14, 1.38, 0, .07, .05, .07), .05);
  const r = Math.hypot(x, (zz - .01) * 1.08), ds = (r - (.156 + (1.05 - y) * .15)) * .8, th = Math.atan2(x, zz);
  return S.smin(d, Math.max(Math.abs(ds + .01) - .01, y - 1.05, hemY(th) - y), .02);
}
const tunicW = makeWarp(tunicS, { b: [0, .66, -.26, .3, 1.5, .16], front: { parts: ['tunic', 'belt', 'pendant'], mode: 'sym', ymax: 1.28 }, side: { parts: ['tunic', 'belt'], mode: 'front', pivot: BZ, ymax: 1.34 }, smooth: 3 });
function beltS(x, y, z) {
  const r = Math.hypot(x, (z - BZ - .015) * 1.06); let d = Math.max(Math.abs(r - .166) - .011, Math.abs(y - 1.055) - .034);
  d = Math.min(d, Math.max(Math.abs(r - .18) - .009, Math.abs(y - .975 - x * .12) - .02));
  return Math.min(d, S.box(x, y, z, .105, .94, BZ + .16, .016, .045, .008, .004));
}
const pendS = (x, y, z) => Math.max((Math.abs(x) * 1.6 + Math.abs(y - 1.315) - .04) * .6, Math.abs(z - .1) - .009);
function daggerS(x, y, z) {                  // hangs from the belt, blade angled out and back
  const px = Math.abs(x); let d = S.cone(px, y, z, .16, 1.1, -.0, .172, .995, -.018, .017, .0165);
  d = Math.min(d, S.sph(px, y, z, .158, 1.108, .001, .023), S.cone(px, y, z, .128, .985, -.016, .218, .962, -.03, .012, .012));
  const t = S.clamp((.972 - y) / .327, 0, 1), cx = .176 + t * .108, cz = -.024 - t * .12, w = .034 * (1 - Math.pow(t, 1.6) * .97);
  return Math.min(d, Math.max(Math.abs(px - cx) * .9 + Math.abs(z - cz) * 2.6 - w, y - .975, .645 - y) * .5);
}
const buckleS = (x, y, z) => Math.max(S.box(x, y, z, 0, 1.055, BZ + .176, .034, .04, .008, .006), -S.box(x, y, z, 0, 1.055, BZ + .176, .017, .023, .03, .003));
/* ---------- arms ---------- */
const SH = [.2, 1.37, -.1], EL = [.3, 1.15, -.12], WR = [.325, .95, -.105];
const sleeveS = (x, y, z) => { const px = Math.abs(x); return S.smin(S.cone(px, y, z, SH[0], SH[1], SH[2], EL[0], EL[1], EL[2], .066, .062), S.sph(px, y, z, .298, 1.155, -.12, .066), .03) + .0045 * Math.sin(y * 52 - px * 30) * S.ss(1.3, 1.2, y); };
const sleeveW = makeWarp(sleeveS, { b: [.08, 1.06, -.22, .42, 1.46, 0], front: { parts: ['sleeves'], mode: 'pair', ymax: 1.27 }, side: { mode: 'round' } });
const bracerS = (x, y, z) => { const t = S.clamp((1.15 - y) / .2, 0, 1); return S.cone(Math.abs(x), y, z, .3, 1.15, -.12, WR[0], WR[1], WR[2], .058, .046) - .006 * (S.ss(.14, .06, t) + S.ss(.86, .94, t)); };
const bracerW = makeWarp(bracerS, { b: [.2, .92, -.2, .42, 1.18, -.02], front: { parts: ['bracers'], mode: 'pair' }, side: { mode: 'round' } });
function handS(x, y, z) {                    // relaxed hand: curled fingers read as one mass with knuckle and finger breaks
  const px = Math.abs(x); let d = S.ell(px, y, z, .322, .845, -.08, .056, .105, .04);
  d = S.smin(d, S.cone(px, y, z, .32, .96, -.1, .32, .9, -.09, .04, .04), .02);
  d = S.smin(d, S.cone(px, y, z, .286, .875, -.05, .297, .795, -.042, .02, .015), .008);       // thumb
  for (let i = 0; i < 3; i++) d = S.smax(d, -(S.cone(px, y, z, .31 + i * .019, .855, -.04, .303 + i * .013, .74, -.052, .0055, .0045)), .004);   // finger breaks
  return d;
}
const handF = trim(handS, { front: 'hands', k: .006 });
/* ---------- legs ---------- */
function trouserS(x, y, z) {
  const px = Math.abs(x); let d = S.ell(px, y, z, 0, .83, BZ, .185, .13, .15);
  d = S.smin(d, S.cone(px, y, z, .1, .78, -.05, .145, .53, -.05, .108, .094), .05); d = S.smin(d, S.ell(px, y, z, .15, .425, -.085, .088, .11, .105), .05);
  d = S.smin(d, S.cone(px, y, z, .137, .335, -.125, .136, .29, -.13, .056, .05), .03) + .006 * Math.sin(y * 48 + px * 26 + z * 14) * S.ss(.66, .44, y) * S.ss(.3, .36, y);
  return Math.min(d, Math.hypot(Math.hypot(px - .136, z + .128) - .054, y - .312) - .012);     // cuff band
}
const trouserW = makeWarp(trouserS, { b: [0, .27, -.28, .34, .98, .14], front: { parts: ['trousers'], mode: 'pair', ymax: .7 }, side: { parts: ['trousers'], mode: 'front', pivot: BZ, ymax: .7 }, smooth: 3 });
/* lower leg and foot are one sloping wedge, as drawn: cuff high at the back, toes forward, no heel on the ground */
const TOES = [[.158, .068], [.208, .09], [.258, .086], [.303, .06]];
function legS(x, y, z) {
  const px = Math.abs(x); let d = S.cone(px, y, (z + .08) * .6 - .08, .132, .31, -.135, .192, .055, -.03, .048, .056);
  d = S.smin(d, S.ell(px, y, z, .178, .035, -.055, .052, .04, .075), .03);
  for (const [tx, tz] of TOES) d = S.smin(d, S.cone(px, y, z, .2, .045, -.02, tx, .018, tz, .027, .017), .009);
  for (const [tx, tz] of TOES) d = Math.min(d, S.cone(px, y, z, tx, .018, tz, tx + (tx - .2) * .22, .004, tz + .03, .011, .002));     // claws
  return Math.max(d, -y - .008);
}
const legT = trim(legS, { front: 'lowerleg', side: 'lowerleg', k: .022 });
const legF = (x, y, z) => Math.min(legT(x, y, z), S.cone(Math.abs(x), y, z, .132, .36, -.14, .14, .26, -.12, .04, .043));
const clawMk = (x, y, z) => { const px = Math.abs(x); let m = 9; for (const [tx, tz] of TOES) m = Math.min(m, S.cone(px, y, z, tx, .018, tz, tx + (tx - .2) * .22, .004, tz + .03, .011, .002)); return .003 - m; };
const daggerF = daggerS;
const A = (W_, g) => W_.apply(g);
/* c: up to three flat colours; mk: marking fields that switch to colour 2 / 3 where positive */
const PARTS = [
  { name: 'tail', b: [-.2, .7, -.82, .2, 1.76, -.1], h: .0075, f: (x, y, z) => Math.min(tailF(x, y, z), tailRoot(x, y, z)), c: [COL.fur] },
  { name: 'cloak', b: [-.44, .34, -.42, .44, 1.52, .16], h: .0065, f: cloakW.f, c: [COL.cloak] },
  { name: 'trousers', b: [-.34, .26, -.3, .34, 1.0, .16], h: .007, f: trouserW.f, c: [COL.trou] },
  { name: 'shins', gid: 13, b: [-.3, .07, -.3, .3, .38, .04], h: .005, f: (x, y, z) => Math.max(legF(x, y, z), .092 - y), c: [COL.fur] },
  { name: 'feet', gid: 13, b: [-.36, -.02, -.24, .36, .14, .16], h: .004, f: (x, y, z) => Math.max(legF(x, y, z), y - .118), c: [COL.fur, COL.claw], mk: (x, y, z) => [clawMk(x, y, z), -1] },
  { name: 'tunic', b: [-.3, .64, -.28, .3, 1.5, .18], h: .0065, f: tunicW.f, c: [COL.green, COL.cream], mk: (x, y, z) => [Math.min(.068 - Math.abs(x), (z - BZ) * .6), -1] },
  { name: 'belt', b: [-.3, .9, -.28, .3, 1.14, .18], h: .005, f: A(tunicW, beltS), c: [COL.belt] },
  { name: 'buckle', pid: 'belt', gid: 20, b: [-.06, 1.0, .06, .06, 1.11, .2], h: .003, f: A(tunicW, buckleS), c: [COL.steel] },
  { name: 'pendant', b: [-.06, 1.24, .02, .06, 1.38, .16], h: .0035, f: A(tunicW, pendS), c: [COL.pend] },
  { name: 'daggers', b: [-.36, .62, -.22, .36, 1.15, .04], h: .004, f: daggerF, c: [COL.steel, COL.leather], mk: (x, y, z) => [y - .985, -1] },
  { name: 'hands', b: [-.42, .7, -.16, .42, .97, 0], h: .0045, f: handF, c: [COL.fur] },
  { name: 'sleeves', b: [-.42, 1.04, -.24, .42, 1.48, .02], h: .006, f: sleeveW.f, c: [COL.cream] },
  { name: 'bracers', b: [-.44, .9, -.22, .44, 1.2, 0], h: .005, f: bracerW.f, c: [COL.leather] },
  { name: 'cape', b: [-.4, 1.14, -.38, .4, 1.7, .2], h: .006, f: capeW.f, c: [COL.cloak] },
  { name: 'head', b: [-.22, 1.38, -.22, .22, 1.96, .27], h: .004, f: (x, y, z) => Math.min(headF(x, y, z), neckF(x, y, z)), c: [COL.fur, COL.white, COL.ring],
    mk(x, y, z) { const px = Math.abs(x), e = eyeLocal(px, y, z);
      const muzzle = Math.min(1.71 - y, z - .1, .078 + (1.7 - y) * .35 - px), jaw = Math.min(1.66 - y + px * .12, z + .03 + (1.66 - y) * .6, .13 - px);
      return [Math.max(muzzle, jaw), .05 - Math.hypot((e[0] + .004) * .9, (e[1] - .006) * 1.5)]; } },
  { name: 'jaw', pid: 'head', gid: 1, b: [-.08, 1.59, .02, .08, 1.68, .22], h: .0035, f: jawF, c: [COL.white] },
  { name: 'eyes', pid: 'head', gid: 17, b: [-.14, 1.72, .02, .14, 1.83, .14], h: .003, f: eyeF, c: [COL.eye, hex('#ffffff'), COL.iris],
    mk(x, y, z) { const px = Math.abs(x), e = eyeLocal(px, y, z); return [.0065 - Math.hypot(e[0] + .008, e[1] - .009), Math.hypot(e[0], e[1] + .004) - .0225]; } },
  { name: 'brows', pid: 'head', gid: 21, b: [-.14, 1.8, .03, .14, 1.86, .14], h: .003, c: [COL.furD],
    f: (x, y, z) => { const px = Math.abs(x); return S.smin(S.cone(px, y, z, .046, 1.814, .132, .084, 1.832, .112, .006, .0095), S.cone(px, y, z, .084, 1.832, .112, .125, 1.824, .07, .0095, .004), .004); } },
  { name: 'nose', pid: 'head', gid: 18, b: [-.05, 1.64, .17, .05, 1.73, .24], h: .003, f: noseF, c: [COL.nose] },
  { name: 'ears', b: [-.2, 1.82, -.14, .2, 2.05, .02], h: .0035, f: earF, c: [COL.fur, COL.ear], mk: (x, y, z) => [.012 - earS(Math.abs(x), y, z)[1], -1] }
];
const GUIDES = [0, 1.05, 1.5, 1.89];
/* whiskers: [root, mid, tip] per side, mirrored */
const WHISKERS = [[[.045, 1.692, .2], [.1, 1.698, .175], [.16, 1.69, .12]], [[.048, 1.682, .198], [.105, 1.676, .17], [.165, 1.655, .12]], [[.045, 1.672, .195], [.095, 1.655, .17], [.145, 1.625, .125]]];
