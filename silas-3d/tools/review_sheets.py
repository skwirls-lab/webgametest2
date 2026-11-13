# Builds reference-vs-model comparison sheets for a report folder. usage: python3 tools/review_sheets.py reports/<tag>
import cv2, numpy as np, json, sys
out = sys.argv[1]; VM = json.load(open('build/ref/viewmap.json')); S = 645.0
def refcrop(v, u0, u1, y0, y1, size):
    V = VM[v]; im = cv2.imread('build/ref/' + v + '_tight.png', cv2.IMREAD_UNCHANGED); a = im[..., 3:] / 255.; im = (im[..., :3] * a + np.array([166, 174, 180]) * (1 - a)).astype(np.uint8)
    x0, x1, yy0, yy1 = int(V['cx'] + u0 * S), int(V['cx'] + u1 * S), int(V['gy'] - y1 * S), int(V['gy'] - y0 * S)
    c = np.full((yy1 - yy0, x1 - x0, 3), (166, 174, 180), np.uint8); sx0, sy0 = max(0, x0), max(0, yy0); sx1, sy1 = min(im.shape[1], x1), min(im.shape[0], yy1)
    c[sy0 - yy0:sy1 - yy0, sx0 - x0:sx1 - x0] = im[sy0:sy1, sx0:sx1]; return cv2.resize(c, size, interpolation=cv2.INTER_CUBIC)
def pair(name, v, u0, u1, y0, y1):
    m = cv2.imread(f'{out}/{name}.png'); r = refcrop(v, u0, u1, y0, y1, (m.shape[1], m.shape[0])); bar = np.full((34, m.shape[1] * 2 + 12, 3), 40, np.uint8)
    cv2.putText(bar, 'REFERENCE', (10, 24), cv2.FONT_HERSHEY_SIMPLEX, .7, (255, 255, 255), 2); cv2.putText(bar, 'MODEL', (m.shape[1] + 22, 24), cv2.FONT_HERSHEY_SIMPLEX, .7, (255, 255, 255), 2)
    return np.vstack([bar, np.hstack([r, np.full((m.shape[0], 12, 3), 40, np.uint8), m])])
for name, args in dict(c_face_front=('front', -.2, .2, 1.55, 2.04), c_face_side=('side', -.2, .26, 1.55, 2.04), c_hand=('front', .2, .42, .68, 1.0), c_feet=('front', -.36, .36, -.02, .36), c_feet_side=('side', -.28, .14, -.02, .38), c_belt=('front', -.3, .3, .62, 1.42)).items():
    cv2.imwrite(f'{out}/cmp_{name[2:]}.jpg', pair(name, *args))
# full figure: reference views over model sheet
sh = cv2.imread(f'{out}/sheet.png'); refs = []
for v in ['front', 'side', 'back']:
    V = VM[v]; refs.append(refcrop(v, -V['cx'] / S, (V['w'] - V['cx']) / S, (V['gy'] - V['h']) / S, V['gy'] / S, (V['w'], V['h'])))
hh = max(r.shape[0] for r in refs); row = np.hstack([cv2.copyMakeBorder(r, hh - r.shape[0], 0, 30, 30, cv2.BORDER_CONSTANT, value=(166, 174, 180)) for r in refs])
row = cv2.resize(row, (sh.shape[1], int(row.shape[0] * sh.shape[1] / row.shape[1]))); cv2.imwrite(f'{out}/cmp_full.jpg', np.vstack([row, sh]))
