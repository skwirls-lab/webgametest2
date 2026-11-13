# Scores the model's part-ID renders against the labelled reference views. usage: python3 tools/score.py <report dir>
import cv2, numpy as np, json, sys
from parts import *
out = sys.argv[1]; B = 'build/'; HGT = 2.04; res = {}; U = S / 3
IGN = {'front': ['tail', 'staff'], 'back': ['tail', 'staff'], 'side': ['staff', 'hands', 'bracers', 'sleeves']}
lines = []
for v in ['front', 'side', 'back']:
    ref = cv2.imread(B + 'ref/' + v + '_lab3.png', 0).astype(int); mod = np.rint(cv2.imread(B + 'model_' + v + '_id.png', 0) / 12.0).astype(int)
    # boundaries the drawing does not define are merged: cape/cloak are one cloth; in the side view the two staggered legs make shin/foot ambiguous
    for a_, b_ in [('cloak', 'cape')] + ([('feet', 'shins')] if v == 'side' else []):
        ref[ref == PID[a_]] = PID[b_]; mod[mod == PID[a_]] = PID[b_]
    h, w = min(ref.shape[0], mod.shape[0]), min(ref.shape[1], mod.shape[1]); ref, mod = ref[:h, :w], mod[:h, :w]
    ig = np.isin(ref, [PID[n] for n in IGN[v]]) | np.isin(mod, [PID[n] for n in IGN[v]])
    R = (ref > 0) & ~ig; Mm = (mod > 0) & ~ig; iou = (R & Mm).sum() / max(1, (R | Mm).sum()); res[v] = dict(iou=round(float(iou), 4), parts={}, lm={})
    lines.append(f'{v:5s} whole IoU {iou:.3f}')
    for pid in range(1, len(PARTS)):
        n = PARTS[pid]
        if n in IGN[v]: continue
        a = (ref == pid) & ~ig; b = (mod == pid) & ~ig
        if a.sum() < 30: continue
        pi = (a & b).sum() / max(1, (a | b).sum()); res[v]['parts'][n] = round(float(pi), 3)
        def meas(m):
            ys, xs = np.where(m)
            if len(ys) < 5: return None
            t, bt = ys.min(), ys.max(); o = dict(top=-t / U, bottom=-bt / U, left=xs.min() / U, right=xs.max() / U)
            for q in (.25, .5, .75):
                row = np.where(m[int(t + (bt - t) * q)])[0]; o['w%d' % (q * 100)] = (row.max() - row.min()) / U if len(row) else 0
            return o
        ma, mb = meas(a), meas(b)
        if ma and mb: res[v]['lm'][n] = {k: round(abs(ma[k] - mb[k]) / HGT * 100, 2) for k in ma}
    tg = [PID[n] for n in ('tunic', 'belt', 'pendant', 'daggers')]; a = np.isin(ref, tg) & ~ig; b = np.isin(mod, tg) & ~ig
    if a.sum() > 30: res[v]['parts']['TORSO'] = round(float((a & b).sum() / max(1, (a | b).sum())), 3)
    worst = sorted(res[v]['parts'].items(), key=lambda t: t[1])
    lines.append('      part IoU: ' + '  '.join(f'{n} {x:.2f}' for n, x in worst))
    lm = [(n, k, e) for n, d in res[v]['lm'].items() for k, e in d.items()]; lm.sort(key=lambda t: -t[2])
    lines.append(f'      landmark error (% of height): max {lm[0][2] if lm else 0:.2f}, over 1.5%: ' + (', '.join(f'{n}.{k} {e:.1f}' for n, k, e in lm if e > 1.5) or 'none'))
    vis = np.zeros((h, w, 3), np.uint8); vis[R & Mm] = (90, 90, 90); vis[R & ~Mm] = (60, 60, 230); vis[~R & Mm] = (230, 160, 40); vis[ig & ((ref > 0) | (mod > 0))] = (40, 40, 40)
    eb = cv2.morphologyEx(mod.astype(np.uint8), cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8)) > 0; er = cv2.morphologyEx(ref.astype(np.uint8), cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8)) > 0
    vis[er] = (255, 255, 255); vis[eb & ~er] = (0, 220, 255)
    cv2.imwrite(f'{out}/overlay_{v}.png', cv2.resize(vis, None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST))
json.dump(res, open(out + '/scores.json', 'w'), indent=1); print('\n'.join(lines)); open(out + '/scores.txt', 'w').write('\n'.join(lines) + '\n')
