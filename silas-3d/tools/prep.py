# Phase 0: tight cut-outs + per-part label maps of the reference views.
# usage: python3 tools/prep.py   (run from silas-3d/; needs build/ref/{front,side,back}.png from tools/seg.py)
import cv2, numpy as np, json, sys
from parts import *
B = 'build/ref/'; VM = {}
for name in ['front', 'side', 'back']:
    rgba = cv2.imread(B + name + '.png', cv2.IMREAD_UNCHANGED); bgr = rgba[..., :3].copy(); fg = (rgba[..., 3] > 0).astype(np.uint8); h, w = fg.shape
    # --- tighten: peel paper-coloured pixels that connect to the outside
    paper = np.median(bgr[fg == 0].reshape(-1, 3), 0) if (fg == 0).any() else np.array([150, 160, 168])
    sm = cv2.GaussianBlur(bgr, (0, 0), 1.5).astype(np.int16)
    lab = cv2.cvtColor(cv2.GaussianBlur(bgr, (0, 0), 1.5), cv2.COLOR_BGR2LAB).astype(np.int16)
    # local paper estimate: median of a wide blur of non-figure pixels
    papermap = cv2.inpaint(cv2.medianBlur(bgr, 31), fg * 255, 9, cv2.INPAINT_TELEA) if False else None
    plab = cv2.cvtColor(np.uint8([[paper]]), cv2.COLOR_BGR2LAB)[0, 0].astype(np.int16)
    dl = np.abs(lab[..., 0] - plab[0]); dc = np.hypot(lab[..., 1] - plab[1], lab[..., 2] - plab[2])
    paperlike = ((dl < 26) & (dc < 7)).astype(np.uint8)
    walk = ((fg == 0) | (paperlike == 1)).astype(np.uint8); n, lb = cv2.connectedComponents(walk, connectivity=4)
    outside = np.unique(lb[fg == 0]); peel = np.isin(lb, outside) & (fg == 1)
    fg2 = fg.copy(); fg2[peel] = 0; fg2 = cv2.morphologyEx(fg2, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lb, st, _ = cv2.connectedComponentsWithStats(fg2, 8); keep = [i for i in range(1, n) if st[i, 4] > 400]; fg2 = np.isin(lb, keep).astype(np.uint8)
    # --- view mapping
    top = np.where(fg2[int(h * .09):int(h * .14)].any(0))[0]
    cx = {'front': (top.min() + top.max()) / 2, 'back': (top.min() + top.max()) / 2, 'side': 489.0}[name]; gy = h - 9.0
    VM[name] = dict(s=S, cx=float(cx), gy=float(gy), w=w, h=h)
    # --- part labels: multi-source geodesic growth from seeds; ink lines and colour changes are expensive to cross,
    #     and each part pays extra to enter colours unlike its own seeds
    import heapq
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY); sgn = -1 if name == 'back' else 1
    labf = cv2.cvtColor(cv2.bilateralFilter(bgr, 9, 30, 5), cv2.COLOR_BGR2LAB).astype(np.float32)
    ink = (gray < 75).astype(np.float32)
    lab_ = np.zeros((h, w), np.int32); dist = np.full((h, w), 1e9, np.float32); heap = []; models = {}
    for part, pts in SEEDS[name].items():
        cols = []
        for (u, y) in pts:
            px, py = int(round(cx + sgn * u * S)), int(round(gy - y * S))
            if 0 <= px < w and 0 <= py < h and fg2[py, px]:
                cols.append(labf[max(0, py - 3):py + 4, max(0, px - 3):px + 4].reshape(-1, 3).mean(0))
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        qy, qx = py + dy, px + dx
                        if 0 <= qx < w and 0 <= qy < h and fg2[qy, qx]: dist[qy, qx] = 0; lab_[qy, qx] = PID[part]; heap.append((0.0, qy, qx, PID[part]))
        if cols: models[PID[part]] = np.array(cols, np.float32)
    un = np.full((len(PARTS), h, w), 40, np.float32)
    for pid, cols in models.items():
        d = np.full((h, w), 1e9, np.float32)
        for c in cols: d = np.minimum(d, np.sqrt(((labf - c) ** 2).sum(2)))
        un[pid] = np.minimum(d, 40)
    heapq.heapify(heap); L0, L1, L2 = labf[..., 0], labf[..., 1], labf[..., 2]; done = np.zeros((h, w), bool)
    while heap:
        d, y, x, pid = heapq.heappop(heap)
        if done[y, x]: continue
        done[y, x] = True; lab_[y, x] = pid
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            qy, qx = y + dy, x + dx
            if 0 <= qy < h and 0 <= qx < w and fg2[qy, qx] and not done[qy, qx]:
                step = 1 + 9 * ink[qy, qx] + .7 * (abs(L0[qy, qx] - L0[y, x]) + abs(L1[qy, qx] - L1[y, x]) + abs(L2[qy, qx] - L2[y, x])) + .3 * un[pid, qy, qx]
                nd = d + step
                if nd < dist[qy, qx]: dist[qy, qx] = nd; heapq.heappush(heap, (nd, qy, qx, pid))
    lab_[fg2 == 0] = 0; lab_ = np.where(fg2 == 1, cv2.medianBlur(lab_.astype(np.uint8), 5), 0).astype(np.int32)
    cv2.imwrite(B + name + '_labels.png', lab_.astype(np.uint8)); cv2.imwrite(B + name + '_tight.png', np.dstack([bgr, fg2 * 255]))
    vis = np.array(COLORS, np.uint8)[lab_]; vis = (vis * .6 + bgr * .4).astype(np.uint8); vis[fg2 == 0] = (60, 50, 50)
    for part, pts in SEEDS[name].items():
        for (u, y) in pts: cv2.circle(vis, (int(round(cx + sgn * u * S)), int(round(gy - y * S))), 2, (255, 255, 255), -1)
    cv2.imwrite(B + name + '_labels_vis.jpg', vis); print(name, VM[name], 'halo removed px', int(peel.sum()))
json.dump(VM, open(B + 'viewmap.json', 'w'))
