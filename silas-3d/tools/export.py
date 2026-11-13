# Phase 0: turns the labelled reference views into data the model and the scoring harness use.
# usage (from silas-3d/): PYTHONPATH=tools python3 tools/export.py  -> src/refdata.js, build/ref/*_lab3.png
import cv2, numpy as np, json, base64
from parts import *
B = 'build/ref/'; VM = json.load(open(B + 'viewmap.json')); STEP = 3; out = dict(vm=VM, rows={}, sdf={}, ink={}, parts=PARTS)
SDF_WANT = {'front': ['head', 'ears', 'hands', 'lowerleg', 'cape', 'daggers'], 'side': ['head', 'ears', 'lowerleg', 'tail', 'cape'], 'back': ['head']}
def clean(mask, r):  # bold, simple outline
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)); return cv2.morphologyEx(cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k), cv2.MORPH_OPEN, k)
pal = {}
for name in ['front', 'side', 'back']:
    V = VM[name]; lab = cv2.imread(B + name + '_labels.png', 0); rgba = cv2.imread(B + name + '_tight.png', cv2.IMREAD_UNCHANGED); bgr = rgba[..., :3]; h, w = lab.shape; cx, gy = V['cx'], V['gy']
    sgn = -1 if name == 'back' else 1
    cv2.imwrite(B + name + '_lab3.png', lab[::STEP, ::STEP])
    rows = {}
    for pid in range(1, len(PARTS)):
        m = lab == pid
        if m.sum() < 50: continue
        r = []
        for y0 in range(0, h, STEP):
            cols = np.where(m[y0:y0 + STEP].any(0))[0]
            if len(cols) == 0: r.append(None); continue
            if name == 'side': r.append([round((cols.min() - cx) / S, 4), round((cols.max() - cx) / S, 4)]); continue
            R = cols[cols >= cx]; L = cols[cols < cx]; vals = []
            if len(R): vals.append(((R.min() - cx) / S, (R.max() - cx) / S))
            if len(L): vals.append(((cx - L.max()) / S, (cx - L.min()) / S))
            a = float(np.mean([v[0] for v in vals])); b = float(np.mean([v[1] for v in vals]))
            if len(R) and len(L) and R.min() - L.max() < 6: a = 0.0
            r.append([round(a, 4), round(b, 4)])
        rows[PARTS[pid]] = r
    out['rows'][name] = dict(y0=round(gy / S, 4), dy=round(STEP / S, 5), parts=rows)   # row i is at model y = y0 - i*dy
    out['sdf'][name] = {}
    for part in SDF_WANT[name]:
        m = (np.isin(lab, [PID['shins'], PID['feet']]) if part == 'lowerleg' else (lab == PID[part])).astype(np.uint8)
        if part == 'tail': m = clean(m, 7); cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); m[:] = 0; cv2.drawContours(m, [cv2.approxPolyDP(c, 2.5, True) for c in cs if cv2.contourArea(c) > 2000], -1, 1, -1)
        if name != 'side' and part in ('head', 'cape', 'cloak', 'tunic'):   # symmetrise central parts
            icx = int(round(cx)); half = min(icx, w - icx - 1); sym = m.copy()
            L = m[:, icx - half:icx]; R = m[:, icx + 1:icx + 1 + half]; u = np.maximum(L[:, ::-1], R) if part != 'head' else ((L[:, ::-1].astype(int) + R) >= 1).astype(np.uint8)
            sym[:, icx + 1:icx + 1 + half] = u; sym[:, icx - half:icx] = u[:, ::-1]; m = sym
        ys, xs = np.where(m)
        if len(ys) == 0: continue
        pad = 40; x0, x1, y0, y1 = max(0, xs.min() - pad), min(w, xs.max() + pad), max(0, ys.min() - pad), min(h, ys.max() + pad)
        c = m[y0:y1, x0:x1]; d = cv2.distanceTransform(1 - c, cv2.DIST_L2, 5) - cv2.distanceTransform(c, cv2.DIST_L2, 5)
        d = cv2.GaussianBlur(d, (0, 0), 1.2)[::STEP, ::STEP] / S
        q = np.clip(np.round(d / .002), -127, 127).astype(np.int8)
        out['sdf'][name][part] = dict(w=q.shape[1], h=q.shape[0], u0=round(sgn * (x0 - cx) / S, 5), y0=round((gy - y0) / S, 5), d=round(STEP / S, 6), sgn=sgn, data=base64.b64encode(q.tobytes()).decode())
    # palette samples: median of the mid-tones of each part
    labc = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    for pid in range(1, len(PARTS)):
        px = bgr[lab == pid]
        if len(px) < 200: continue
        Z = cv2.cvtColor(px.reshape(-1, 1, 3), cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
        _, lb, cen = cv2.kmeans(Z, 3, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1), 2, cv2.KMEANS_PP_CENTERS)
        cnt = np.bincount(lb.flatten(), minlength=3); rgb = cv2.cvtColor(cen.reshape(1, 3, 3).astype(np.uint8), cv2.COLOR_LAB2RGB)[0]
        pal.setdefault(PARTS[pid], {})[name] = sorted([('#%02x%02x%02x' % tuple(int(v) for v in rgb[i]), round(float(cnt[i]) / len(px), 2)) for i in range(3)], key=lambda t: -t[1])
    # ink layer: interior dark line art, kept as filled shapes, tagged with the part it sits on
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY); fg = (lab > 0).astype(np.uint8)
    thr = np.full(gray.shape, 62.0, np.float32)
    for pid in range(1, len(PARTS)):                      # dark cloth: only strokes clearly darker than the cloth itself count as line art
        mm = lab == pid
        if mm.sum() > 200: thr[mm] = min(62.0, .5 * float(np.median(gray[mm])) + 4)
    ink = ((gray < thr) & (fg > 0)).astype(np.uint8)
    blob = cv2.dilate(cv2.morphologyEx(ink, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))), np.ones((7, 7), np.uint8))
    ink[blob > 0] = 0                                      # filled shadow shapes are not lines
    edge = cv2.morphologyEx(lab, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8)) > 0     # part and silhouette boundaries: drawn by the line pass instead
    ink[cv2.dilate(edge.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0] = 0
    n, lb, st, _ = cv2.connectedComponentsWithStats(ink, 8); ink = np.isin(lb, [i for i in range(1, n) if st[i, 4] >= 14]).astype(np.uint8)
    cs, _ = cv2.findContours(ink, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_L1); polys = []
    for c in cs:
        if cv2.contourArea(c) < 6: continue
        p = cv2.approxPolyDP(c, .6, True).reshape(-1, 2)
        if len(p) < 3: continue
        mx, my = int(p[:, 0].mean()), int(p[:, 1].mean()); pid = int(np.bincount(lab[np.clip(p[:, 1], 0, h - 1), np.clip(p[:, 0], 0, w - 1)]).argmax())
        polys.append([pid, [int(round(v)) for xy in p for v in ((xy[0] - cx) * sgn / S * 2000, (gy - xy[1]) / S * 2000)]])
    out['ink'][name] = polys; cv2.imwrite(B + name + '_ink.png', (1 - ink) * 255); print(name, 'ink shapes', len(polys))
json.dump(pal, open(B + 'palette_samples.json', 'w'), indent=1)
open('src/refdata.js', 'w').write('/* generated by tools/export.py from the reference model sheet — do not edit */\nconst REFD = ' + json.dumps(out, separators=(',', ':')) + ';\n')
import os; print('refdata.js', os.path.getsize('src/refdata.js') // 1024, 'kB')
