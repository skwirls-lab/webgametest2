# Cuts the front / side / back figures out of the reference model sheet (GrabCut seeded by ink-outline flood fill).
# usage: python3 seg.py <sheet.jpg> <outdir>   -> outdir/{front,side,back}.png (RGBA crops)
import cv2, numpy as np, sys
src, out = sys.argv[1], sys.argv[2]
im = cv2.imread(src); H, W = im.shape[:2]
gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
bgm = cv2.medianBlur(im, 151).astype(np.int16)
diff = np.abs(im.astype(np.int16) - bgm).sum(2)
ink = (gray < 85).astype(np.uint8)
dist = cv2.distanceTransform(1 - ink, cv2.DIST_L2, 3)
ff = cv2.dilate(ink, np.ones((3, 3), np.uint8)); m = np.zeros((H + 2, W + 2), np.uint8)
ys, xs = np.where((diff < 16) & (dist > 28))
for k in range(0, len(ys), 97):
    if ff[ys[k], xs[k]] == 0: cv2.floodFill(ff, m, (int(xs[k]), int(ys[k])), 2)
closed = cv2.morphologyEx((ff != 2).astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
VIEWS = dict(front=(165, 690), side=(1345, 2060), back=(2090, 2700))
for name, (x0, x1) in VIEWS.items():
    y0, y1 = 90, 1480
    c = im[y0:y1, x0:x1]; cl = closed[y0:y1, x0:x1]; d = diff[y0:y1, x0:x1]; di = dist[y0:y1, x0:x1]
    gm = np.full(c.shape[:2], cv2.GC_PR_BGD, np.uint8)
    gm[cl > 0] = cv2.GC_PR_FGD
    gm[cv2.erode(cl, np.ones((15, 15), np.uint8)) > 0] = cv2.GC_FGD
    dark = (cv2.GaussianBlur(d.astype(np.float32), (0, 0), 2) > 36).astype(np.uint8); dark[1330 - y0:] = 0   # anything clearly not paper
    dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    gm[(d < 14) & (di > 34)] = cv2.GC_BGD
    gm[cv2.erode(dark, np.ones((5, 5), np.uint8)) > 0] = cv2.GC_FGD
    if name == 'side': gm[560 - y0:, :100] = cv2.GC_BGD      # the neighbouring view's staff
    gm[:, :6] = cv2.GC_BGD; gm[:, -6:] = cv2.GC_BGD; gm[:8] = cv2.GC_BGD
    gm[1375 - y0:] = np.where(gm[1375 - y0:] == cv2.GC_FGD, cv2.GC_FGD, gm[1375 - y0:])
    b1 = np.zeros((1, 65), np.float64); f1 = np.zeros((1, 65), np.float64)
    cv2.grabCut(c, gm, None, b1, f1, 6, cv2.GC_INIT_WITH_MASK)
    fg = ((gm == cv2.GC_FGD) | (gm == cv2.GC_PR_FGD)).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg, 8); big = 1 + np.argmax(st[1:, 4]); fg = (lab == big).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    cs, _ = cv2.findContours(fg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); solid = np.zeros_like(fg); cv2.drawContours(solid, cs, -1, 1, -1)
    holes = cv2.morphologyEx(solid - fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)); n2, l2, s2, _ = cv2.connectedComponentsWithStats(holes, 8)
    for i in range(1, n2):
        if s2[i, 4] < 9000: fg[l2 == i] = 1      # fill small holes, keep real gaps (between legs, arm and body)
    fg = cv2.erode(fg, np.ones((3, 3), np.uint8))
    ys, xs = np.where(fg); bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    rgba = np.dstack([c, fg * 255])[by0:by1, bx0:bx1]
    cv2.imwrite(f'{out}/{name}.png', rgba); print(name, rgba.shape)
    vis = c.copy(); vis[fg == 0] = (vis[fg == 0] * .3).astype(np.uint8); cv2.imwrite(f'{out}/seg_{name}.jpg', cv2.resize(vis[by0:by1, bx0:bx1], None, fx=.5, fy=.5))
