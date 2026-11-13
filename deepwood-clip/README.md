# Deepwood — a 12-second animated graphic-novel clip, drawn entirely by code

Silas, a young squirrel in a tattered cloak, sprints through the Deepwood at night, is run down by a
monstrous iron-grafted rat-thing, and turns to face it as azure fire wakes in his hands.

Everything on screen is drawn at runtime with the HTML Canvas 2D API: no images, models, textures,
fonts, footage, generative AI or 3D tools. 1920×1080, 24 fps, 12 s (plus a held final panel).

## Watch it

Open **`deepwood.html`** in a desktop browser (Chrome/Edge recommended). It is one self-contained file.

* On load it "inks" all 288 frames once (progress shown at the bottom, typically 20–60 s), then plays
  them back at a steady 24 fps and loops, holding on the final comic panel.
* `deepwood.html?live` skips the warm-up and draws every frame procedurally in real time instead.
* Space / click: pause · ←/→: step one frame · R: restart · F: fullscreen.

A pre-rendered **`deepwood.mp4`** (H.264, 1920×1080) is included too.

## Re-render the MP4

```bash
npm i playwright && npx playwright install chromium   # once; ffmpeg must be on PATH
node build.cjs          # only if you edited src/ – rebuilds deepwood.html
node render-mp4.cjs     # writes deepwood.mp4 (deterministic, frame by frame)
```

## How it is made

| file | what it does |
| --- | --- |
| `src/core.js` | ink engine: variable-weight outlines, flat fills, halftone / flat-tone / spotted-black shadow tiers, rim lights, tapered brush strokes, stroke-built SFX lettering, and the print pass (dry-brush texture, grain, vignette, CMY-style colour misregistration) |
| `src/env.js` | the Deepwood: colossal trunks, arching roots, moon shafts, mist, ferns, speed lines, impact bursts |
| `src/silas.js` | Silas's 2D rig (run / skid / stand / brace poses, cloak and tail simulation), the hero close-up, veins and flame |
| `src/creature.js` | the creature rig: bark and sinew, riveted iron plates, exhaust stacks, glowing seams |
| `src/shots.js` | the four shots: pre-rendered parallax layers, cameras, shake, lighting cues, impact frames |
| `src/main.js` | player / frame cache / export hook |

Style notes: characters are posed "on twos" (12 poses a second, with a line boil on each new pose)
while cameras, parallax and shake run on every frame; shots are joined by hard cuts; impacts get
two-frame black/white impact frames and a burst of misregistration. Screen direction is constant:
the creature is always screen-left of Silas.
