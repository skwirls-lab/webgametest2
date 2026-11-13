# Silas — 3D character kit (step 1: turnaround)

Open `silas-turnaround.html` in a desktop browser. It builds Silas in a few seconds, shows a
four-view model sheet, and gives a drag-to-rotate viewer underneath.

How it is made:

* **Form** — a real 3D model sculpted in code from blended volumes (`src/model.js`), meshed by a
  small surface-nets mesher (`src/sdf.js`). Every landmark was measured off the reference sheet.
* **Surface art** — the front, side and back drawings of the reference sheet are cut out and
  vectorised into flat colour polygons (`tools/seg.py`, `tools/trace.py` -> `src/ref.js`), then
  projected onto the model from those three directions (`src/toon.js`).
* **Look** — toon shading, halftone and inked hull outlines on top (`src/toon.js`).

The only library is three.js (MIT, `vendor/`), inlined by `node build.cjs`. The tools need
Python with `opencv-python-headless` and the reference sheet image; they only have to be re-run
if the reference changes.
