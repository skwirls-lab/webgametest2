# Vectorises the cut-out reference views into flat colour polygons (posterise -> contours -> simplified polygons).
# usage: python3 trace.py <dir with front/side/back.png> <out.js>
import cv2, numpy as np, sys, json
d, out = sys.argv[1], sys.argv[2]; K = 40; res = {}
for name in ['front', 'side', 'back']:
    rgba = cv2.imread(f'{d}/{name}.png', cv2.IMREAD_UNCHANGED); bgr = rgba[..., :3]; a = rgba[..., 3] > 0; h, w = a.shape
    sm = cv2.bilateralFilter(bgr, 7, 28, 5); sm = cv2.bilateralFilter(sm, 7, 22, 5)
    lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).astype(np.float32); pts = lab[a]
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, .5); cv2.setRNGSeed(7)
    _, lb, cen = cv2.kmeans(pts[::3].copy(), K, None, crit, 2, cv2.KMEANS_PP_CENTERS)
    dist = ((pts[:, None, :] - cen[None]) ** 2).sum(2) if len(pts) < 2e5 else None
    lbl = np.zeros(len(pts), np.int32)
    for i in range(0, len(pts), 100000): lbl[i:i + 100000] = ((pts[i:i + 100000, None, :] - cen[None]) ** 2).sum(2).argmin(1)
    L = np.full((h, w), -1, np.int32); L[a] = lbl
    L = np.where(a, cv2.medianBlur((L + 1).astype(np.uint8), 3).astype(np.int32) - 1, -1)
    pal = cv2.cvtColor(cen.reshape(1, K, 3).astype(np.uint8), cv2.COLOR_LAB2BGR).reshape(K, 3)[:, ::-1]
    polys = []
    sil, _ = cv2.findContours(a.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    for k in range(K):
        m = (L == k).astype(np.uint8); m = cv2.dilate(m, np.ones((2, 2), np.uint8))       # slight overlap hides seams
        cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_L1)
        for c in cs:
            ar = cv2.contourArea(c)
            if ar < 5: continue
            p = cv2.approxPolyDP(c, .55, True).reshape(-1, 2)
            if len(p) >= 3: polys.append((ar, k, p.flatten().tolist()))
    polys.sort(key=lambda t: -t[0])
    ys, xs = np.where(a); top = a[: int(h * .2)].nonzero()[1]
    res[name] = dict(w=w, h=h, pal=['#%02x%02x%02x' % tuple(int(v) for v in c) for c in pal], polys=[[k, p] for _, k, p in polys],
                     sil=[cv2.approxPolyDP(c, .8, True).reshape(-1).tolist() for c in sil if cv2.contourArea(c) > 200])
    print(name, w, h, len(polys), 'polys')
open(out, 'w').write('/* traced from the reference model sheet by tools/trace.py */\nconst REF = ' + json.dumps(res, separators=(',', ':')) + ';\n')
