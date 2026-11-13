# Silas — build plan to reference-quality, style-ready model

**How to start:** say **"go"**. I then work through every phase below without stopping for
input, and only come back when the Definition of Done is met or a Hard Blocker (section 7) is hit.

---

## 1. Target

A rigged 3D Silas, generated entirely by code, that

1. **matches the reference sheets** in proportion, silhouette, face and costume from any camera angle,
2. **reads cleanly**: every body part has a defined edge; hands, feet, ears and face are legible at
   both full-figure and close-up size,
3. **is drawn in the clip style** (bold variable-weight ink, flat colour fields, halftone midtones,
   spotted blacks, rim light, misregistration), not as a painted texture, and
4. **is reusable**: one module, posable, relightable, with expressions, for any future cutscene.

"Matches" means the same *design* in the comic style. It does not mean reproducing the painterly
brushwork of the sheets pixel for pixel.

## 2. Why the current model is messy (what this plan fixes)

| Symptom you saw | Cause | Fixed in |
| --- | --- | --- |
| Messy, speckled surface | The painted sheet was posterised and projected as-is, with its baked shading, then shaded again | Phase 3 |
| Smears on arms, tail, back | Art projected onto geometry that does not match it; side drawing has a different arm pose | Phases 2, 3 |
| Can't tell where arm ends and body starts | Outlines come only from thin hulls; no guaranteed line between parts | Phase 4 |
| Ears too tall, face too wide | Proportions were fitted by eye from a few landmarks, never scored | Phases 0, 2 |
| Mushy feet, hands | Low-detail blobs relying on the projected drawing for detail | Phase 5 |

## 3. Decisions already made (so I don't stop to ask)

- **Canonical pose:** relaxed A-pose, arms hanging as in the front view. The staff is a separate
  optional prop, not part of the body.
- **Tail:** the side-view S-curve is canonical. The back view is redrawn to agree with it.
- **Where the sheets disagree,** priority is front view, then side, then back, then the action sheet.
- **Reference use:** the sheets are used for measurements, part silhouettes, palette and ink-line
  tracing. Painted shading from the sheets is not used on the final model.
- **Library:** three.js only. No generative AI, no modelling apps, no downloaded assets.
- **Eyes** are real geometry (needed for blink, look direction and the azure glow).

## 4. The loop every phase runs (the "ralph loop")

```
repeat:
  1. BUILD     make the change
  2. RENDER    produce the phase's standard views (fixed cameras, fixed lighting)
  3. MEASURE   run the phase's numeric checks (section 6 harness)
  4. LOOK      open the renders next to the reference at full size and list defects
  5. CRITIQUE  every 3rd pass, and before any gate: a fresh reviewer that sees only the
               renders + reference + the gate checklist (not my notes) scores each item
  6. FIX       take the top 3 defects by visibility; go to 1
until the gate passes
```

Loop rules:

- **No gate is passed on my own opinion alone.** It needs the numeric checks *and* the independent
  reviewer's pass on every checklist item.
- **Stall rule:** if 3 consecutive passes do not improve the phase's main metric, I switch to the
  phase's listed fallback approach instead of repeating the same kind of fix.
- **Regression rule:** every gate re-runs all earlier gates' numeric checks. A regression is fixed
  before moving on.
- **Log:** each pass appends one line to `STATUS.md` (pass number, metric values, defects fixed,
  defects open). Each passed gate is a git commit with its render sheet.
- **Budget guard:** a phase that exceeds 12 passes is recorded as "passed with exceptions" only if
  its remaining defects are listed in `STATUS.md` with a reason; otherwise it keeps looping.

## 5. Phases and gates

### Phase 0 — Measuring rig and labelled reference

Build the tools that make every later gate objective.

- Clean cut-outs of front, side, back (tighter than today's: no paper halo).
- **Part maps:** each reference view labelled by part (head, ears, cape/hood, cloak, tunic, sleeves,
  bracers, hands, belts, daggers, trousers, lower legs, feet, tail, pendant).
- **Landmark table** (about 60 points: ear tip and base, eye corners, nose, chin, shoulder, elbow,
  wrist, fingertips, belt, hem, knee, cuff, ankle, toe tips, tail spine points) in model units.
- **Ink layer:** the black line art of each view extracted, cleaned and vectorised as strokes.
- **Palette:** one flat base colour per material, sampled from the sheets.
- Harness script: renders the model in the same three orthographic views and reports, per view and
  per part, silhouette overlap (IoU), landmark error, and an overlay image.

**Gate 0:** harness runs end to end in one command; part maps and landmarks reviewed against the
sheet with no mislabelled part; today's model is scored as the baseline.

### Phase 1 — Proportions and silhouette

Re-fit the sculpt part by part against the part maps, front then side.

**Gate 1**
- Whole-figure silhouette IoU: front ≥ 0.93, side ≥ 0.90 (tail and cloak excluded from side score,
  scored separately at ≥ 0.85).
- Per-part IoU ≥ 0.85 for head, ears, torso, each limb segment, hands, feet.
- Every landmark within 1.5 % of body height; ear height, head width and eye line within 1 %.
- Reviewer checklist: head shape, ear size, cheek width, neck, shoulder slope, stance, foot length.

*Fallback if stalled:* build the stalled part directly from its two reference silhouettes
(front outline × side outline) instead of from blended volumes.

### Phase 2 — Form detail: face, hands, feet, cloth

- Face: brow, cheeks, muzzle planes, nose, mouth line, eyelids; separate eyeballs.
- Ears: cupped shape, inner ear, tip tufts.
- Hands: palm, four fingers and thumb with knuckle breaks, claws. Feet: heel, pads, four toes, claws.
- Cloth: real folds on cape, hood, cloak, sleeves, trousers; torn hems; belt buckle, dagger hilts
  and guards, bracer straps, pendant carved leaf.
- Tail: layered fur clumps with a feathered edge, not a tube.

**Gate 2**
- Phase 1 numbers still hold.
- Close-up crops (face front / three-quarter / side, each hand, each foot, belt and daggers,
  pendant) pass the reviewer checklist against the matching reference crops.
- Each of those parts is identifiable in a flat grey, unlit silhouette-plus-edges render (no colour
  to hide behind).

### Phase 3 — Clean surface: flat colour and ink, no projected painting

Replace the projected posterised art.

- Flat material colours from the palette, assigned per part in code.
- Markings authored in code and checked against the sheet: white muzzle, cheeks and throat; eye
  rims; inner ears; cream tunic panel; hem dirt; fur shade breaks.
- Interior ink (fold lines, fur ticks, stitching, seams) from the vectorised reference ink layer,
  applied per part in the part's own space so it does not smear when the camera moves or the rig
  bends.

**Gate 3**
- No region larger than 0.5 % of the figure shows smear, ghosted double lines or paper colour, in 12
  cameras around the model (every 30°), checked by the reviewer and by an automatic speckle count.
- Colour match: each material's mean colour within a small tolerance of the sheet's.
- Turnaround looks like one consistent drawing from all 12 angles.

*Fallback if stalled:* drop traced ink for the failing part and generate its interior lines
procedurally from geometry (creases and curvature).

### Phase 4 — Line work

- Silhouette outlines with variable weight (heavier on the shadow side and at overlaps).
- A guaranteed ink line wherever two different parts meet on screen, and at depth breaks and sharp
  creases, so arm/body, hand/bracer, cuff/leg and toe separations always read.
- Line boil hook for "on twos" animation.

**Gate 4**
- In all 12 turnaround cameras plus 4 close-ups, every part boundary on the checklist is visibly
  inked (automatic check: boundary pixels covered ≥ 95 %).
- Line weight within spec at three sizes: full figure, medium shot, close-up.
- Reviewer: "can you tell where every limb starts and ends" answered yes for every view.

### Phase 5 — Style and lighting

- Shader: banded light, halftone midtones, flat tone, spotted blacks, coloured rim lights.
- Lighting presets: neutral model-sheet, moonlit, violet threat, azure flame.
- Print pass: paint texture, grain, colour misregistration (reused from the clip).
- Eye states: normal, glowing azure; face veins as an animatable layer.

**Gate 5**
- Side-by-side with the night-run reference image and the three-state reference image, using
  matching camera and lighting presets: reviewer passes palette, line feel, shadow shapes, glow.
- The model stays readable in the darkest preset (silhouette and face test).

### Phase 6 — Rig, poses, secondary motion

- Skeleton and skinning; fingers, toes, ears, jaw, eyes, eyelids, brows.
- Cloak, cape, hood and tail driven by simple simulation with pose overrides.
- Pose library: stand, the four action-sheet poses (all fours, dagger stance, leap, arms crossed),
  sprint cycle, skid, brace, flame-hands.

**Gate 6**
- Each action-sheet pose reproduced and compared to the sheet (reviewer checklist per pose).
- No mesh tearing, collapsing joints or cloth passing through the body across the pose library and
  a 2-second sprint cycle (automatic intersection check plus reviewer).
- Line work and surface from Phases 3–4 hold in every pose.

### Phase 7 — Package

- `silas.js` module with a small API: create, set pose, set expression, set lighting preset, update.
- Turnaround page, pose sheet page, close-up sheet page.
- Performance: full-quality frame under 16 ms on a typical laptop GPU; build under 10 s.
- `README.md` on how to use Silas in a new shot; `STATUS.md` final log; this plan updated with what
  was actually done.

**Gate 7 = Definition of Done (section 8).**

## 6. Standard renders and checks

- **T12:** 12-camera turnaround, neutral preset. **O3:** orthographic front/side/back at reference
  scale with overlays. **CU:** close-up set (face ×3, hands, feet, belt, pendant).
  **POSE:** pose sheet. **STYLE:** lighting presets side by side with the reference paintings.
- Numeric checks: silhouette IoU (whole and per part), landmark error, part-boundary ink coverage,
  speckle/smear count, colour distance per material, self-intersection count, frame time.
- All of it runs from one command and writes a dated report folder.

## 7. Hard blockers (the only reasons I stop early)

- The reference sheets contradict each other in a way section 3 does not settle and the choice
  changes the character's design.
- A gate cannot be met after its fallback has also stalled; I stop with the evidence and two
  concrete options.
- Something outside the repo is required (a new reference drawing, a tool that cannot be installed).

Anything else — errors, failed approaches, slow renders — I work through.

## 8. Definition of Done

- Gates 0–6 all pass in a single final run, with the reports committed.
- Turnaround, close-up, pose and style sheets are published in the repo next to the references.
- The independent reviewer's final pass has no failed checklist item; any "passed with exceptions"
  items are listed with reasons.
- A short hand-off note states what matches the reference, what deliberately differs, and what the
  creature should reuse from this pipeline.

## 9. After Silas

The same phases apply to the creature (Phase 0 needs a creature model sheet, or it is designed
from the brief with you approving a turnaround first), then the clip is re-shot with both kits.
