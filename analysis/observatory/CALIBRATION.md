# Model Calibration — CG→Canvas Port Bake-off (2026-08-06)

**Task:** identical prompt to four OpenCode Go models, each in an isolated git worktree:
port `Classes/EOHandTriangleView.mm` (+ its `EOHandView`/`EOScheduledView` transform
machinery) to a strict-mode, dependency-free TypeScript canvas module + a NOTES.md
explaining every Core Graphics → Canvas mapping decision.

**Ground truth** (`Classes/EOScheduledView.mm:41-46` + `EOHandTriangleView.mm:44-45`):
`setupContextForZeroOffsetAndScale` applies `translate(zeroOffset)` then
`scale(scale, -scale)`; the triangle view then applies `scale(1, -1)`. The two Y-flips
**cancel**, leaving a uniform-scale Y-down space — same orientation as HTML canvas, so a
faithful port needs NO net flip. `cgAngle = angle - π/2`; angle is clockwise-positive
from 12 o'clock in the net space.

## Results

| Model | Geometry | Strict compile | Signature spec | File rules | Notes |
|---|---|---|---|---|---|
| **GLM-5.2** | ✔ correct (inferred flip cancellation, stated as explicit assumption) | ✔ | ✘ put `ctx` inside opts instead of `(ctx, opts)` | ✔ | Most thorough: masterScale, fill-rule/join/cap parity notes, try/finally |
| **Kimi K2.7 Code** | ✔ correct (composed both source transforms literally; noted cancellation) | ✔ | ✔ | ✔ | Tersest correct solution; included masterScale + center translate |
| **MiniMax M3** | ✘ vertical mirror (applied single `scale(1,-1)`, missed cancellation) — hand points 6 o'clock instead of 12, rotation reversed | ✔ | ✔ | ✔ | Omitted masterScale (documented); good comments otherwise |
| **MiMo-V2.5-Pro** | ✘✘ dropped the `angle−π/2` offset in hand-derived formulas (90° rotation error) + mischaracterized the angle convention | ✔ | ✔ | ✔ | Confidently wrong derivation — bad signal for a reviewer role |

### Round 3 (same task, GPT-5.6-sol via openai provider — user-selected builder)

| Model | Geometry | Strict compile | Signature spec | File rules | Notes |
|---|---|---|---|---|---|
| **GPT-5.6-sol** | ✔✔ correct; wrote both Y-flips explicitly with a cancellation comment — preserves the source's transform history readably | ✔ | ✔ | ✔ | Uniquely matched the open-path stroke detail (explicit lineTo-to-start, no closePath, as in the source) and typed colors as string \| CanvasGradient \| CanvasPattern. Builder role assignment validated |

### Round 2 (same task, DeepSeek models — user-requested)

| Model | Geometry | Strict compile | Signature spec | File rules | Notes |
|---|---|---|---|---|---|
| **DeepSeek V4 Pro** | ✔✔ correct via a *deliberate* equivalent formulation: reproduced only one Y-flip and compensated with `cgAngle = halfPi − angle`; NOTES explicitly derive the double-flip cancellation | ✔ | ✔ | ✔ | Strongest single showing of all six — full transform-chain understanding, every assumption documented; leanest correct module (55 lines). Center translate + masterScale documented as caller's responsibility |
| **DeepSeek V4 Flash** | ✘ vertical mirror (single `scale(1,-1)`, missed the flip cancellation — same failure as MiniMax M3) | ✔ | ✔ | ✔ | First run blocked by China-hosting opt-in; user opted in and the re-run succeeded. Verdict fits its role: fine for mechanical non-geometry grunt work (`worker`), never assign it coordinate-transform ports |

Artifacts: `analysis/observatory/calibration-artifacts/<model>/` (worktrees cleaned up 2026-08-06).

## Conclusions (n=1 task — directional, not final)

1. **GLM-5.2 as architect: validated.** Correctly reasoned through a three-layer
   transform stack and flagged its one assumption. Watch its spec compliance (deviated
   from the requested function signature).
2. **Kimi K2.7 Code promoted to `porter`** — dedicated agent for CG→canvas view ports.
   It produced the cleanest correct solution on precisely this task class, at a workable
   quota (~1,150 req/5h claimed).
3. **MiniMax M3 stays `builder`** for general implementation volume, but **every port
   touching coordinate transforms gets reviewed** before merge — it failed the exact
   subtlety this project is full of.
4. **MiMo-V2.5-Pro reviewer role is on notice.** A reviewer that confidently mis-derives
   geometry would approve wrong ports. Geometry-critical review goes to `architect`
   (GLM) or Claude; MiMo remains for non-geometry review until it earns more trust.
5. Every model respected the only-create-these-files rule and produced strict-clean TS.
   The failures were *silent semantic* errors — invisible without ground-truth checking.
   This validates the plan to gate all ported views behind rendering/unit tests rather
   than trusting review alone.

## Open items

- Rust-side calibration not yet run (no Rust code exists yet); repeat this exercise on
  the first engine task before finalizing Rust role assignments.
- Re-run this comparison if OpenCode Go rotates model versions.
