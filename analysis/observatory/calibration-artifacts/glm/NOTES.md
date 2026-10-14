# Triangle hand port — Core Graphics → HTML Canvas

This file documents the calibration of `calibration/triangle-hand.ts` against
the original Objective-C++ implementation in `Classes/EOHandTriangleView.mm`
(and the machinery it inherits from `EOHandView` / `EOScheduledView`).

It maps every Core Graphics call used by `-[EOHandTriangleView drawRect:]` to
its canvas equivalent, then lists every assumption made.

## Call-by-call mapping

| Core Graphics (source)                                         | Canvas (port)                                             | Notes |
|----------------------------------------------------------------|------------------------------------------------------------|-------|
| `UIGraphicsGetCurrentContext()` (line 40)                       | `opts.ctx` parameter                                       | The caller supplies the context, mirroring how UIKit hands the current context to `drawRect`. |
| `CGContextSaveGState(context)` (line 41)                       | `ctx.save()`                                                | |
| `setupContextForZeroOffsetAndScale(context, &zeroOffset, masterScale)` (line 44), defined in `EOScheduledView.mm:41-46` as `CGContextTranslateCTM(ctx, oz.x, oz.y); CGContextScaleCTM(ctx, scale, -scale);` | `ctx.translate(centerX, centerY); ctx.scale(masterScale, masterScale);` | Folded: the `-scale` Y flip here is cancelled by the next call; see A3/A4. The translate lands at the clock center (the source's `zeroOffset`, after `roundOutFrameToIntegralBoundaries` pixel snapping). |
| `CGContextScaleCTM(context, 1, -1)` (line 45)                   | (folded in — no separate call)                              | Combined with the `-scale` in the previous call, the net Y scale is positive in UIKit's device space. Because canvas is natively Y-down (same as UIKit's device space), no explicit flip is applied in the port; see A4. |
| `[strokeColor setStroke]` (line 47)                            | `ctx.strokeStyle = strokeColor;`                           | Colors are supplied as CSS color strings; see A1. |
| `if (fillColor) [fillColor setFill]; else [strokeColor setFill];` (lines 48-52) | `ctx.fillStyle = fillColor ?? strokeColor;`  | `undefined` (no fill color supplied) maps to the source's nil case. |
| `CGContextSetLineWidth(context, width/10)` (line 55)           | `ctx.lineWidth = width / 10;`                              | Canvas renders stroke width through the CTM, so under `scale(masterScale)` the visible width is `(width/10)*masterScale` device px, matching CG. See A12. |
| `CGContextMoveToPoint(context, width/2*cos(cgAngle-halfPi), width/2*sin(cgAngle-halfPi))` (line 56) | `ctx.beginPath(); ctx.moveTo(baseX1, baseY1);` | base vertex #1. |
| `CGContextAddLineToPoint(context, length*cos(cgAngle), length*sin(cgAngle))` (line 57) | `ctx.lineTo(tipX, tipY);` | tip. |
| `CGContextAddLineToPoint(context, width/2*cos(cgAngle+halfPi), width/2*sin(cgAngle+halfPi))` (line 58) | `ctx.lineTo(baseX2, baseY2);` | base vertex #2. |
| `CGContextAddLineToPoint(context, length*TAILFRACTION*cos(cgAngle+pi), length*TAILFRACTION*sin(cgAngle+pi))` (line 60) | `ctx.lineTo(tailX, tailY);` | tail. |
| `CGContextAddLineToPoint(context, width/2*cos(cgAngle-halfPi), width/2*sin(cgAngle-halfPi))` (line 61) | `ctx.lineTo(baseX1, baseY1); ctx.closePath();` | closes back to the first vertex; the explicit `closePath()` makes the join clean. |
| `CGContextDrawPath(context, kCGPathFillStroke)` (line 62)       | `ctx.fill(); ctx.stroke();`                                | CG fills with the non-zero winding rule by default; canvas `ctx.fill()` also defaults to `"nonzero"`. Fill first, then stroke, so the stroke draws on top of the fill, matching a single combined fill+stroke pass. |
| `CGContextRestoreGState(context)` (line 64)                    | `ctx.restore()` (in a `try/finally`)                        | |

### Constants

| Source                                                          | Port |
|-----------------------------------------------------------------|------|
| `#define TAILFRACTION 0.21` (`EOHandTriangleView.mm:16`)        | `const TAIL_FRACTION = 0.21;` |
| `#define halfPi (M_PI/2)` (`Constants.h:21`)                    | `const HALF_PI = Math.PI / 2;` |
| `#define pi M_PI` (`Constants.h:19`)                            | `const PI = Math.PI;` |

### Angle convention

The source stores an `angle` ivar and, inside `drawRect:`, derives
`cgAngle = angle - halfPi` (`EOHandTriangleView.mm:43`). All five polygon
vertices are built from `cos(cgAngle)` / `sin(cgAngle)` (and `cgAngle ± halfPi`,
`cgAngle + pi`). The port reproduces this **exactly**: `cgAngle = angle - HALF_PI`
and the same vertex formulas.

Crucially, triangle hands are **not** rotated via a layer transform. In
`-[EOHandView update]` (`EOHandView.mm:154`), `rotateLayer` is set to false for
`EOHandTriangleView` subclasses, so the geometry path is rebuilt every redraw
(`setNeedsDisplay`) with `angle` baked in via `cgAngle`. The port likewise bakes
`angle` into the polygon and never calls `ctx.rotate`.

## Assumptions

- **A1 — Colors as CSS strings.** The source holds `UIColor *strokeColor` /
  `fillColor` and calls `-setStroke` / `-setFill`. The port takes colors as
  CSS color strings (e.g. `"#c83737"`, `"rgba(200,55,55,0.8)"`). Converting the
  app's `UIColor`s to CSS is the caller's responsibility. Any alpha component
  on the `UIColor` is assumed to be folded into the CSS color by the caller.
- **A2 — Units.** `length` and `width` are passed in the same "user units" the
  source uses (pre-`masterScale` points). `centerX`/`centerY` (`centerX` and
  `centerY`) are in canvas device pixels and correspond to the screen position
  of the clock center (the source reaches the clock center indirectly through
  its view-frame layout + `zeroOffset`).
- **A3 — Frame/`zeroOffset` layout not reproduced.** The source's view frame is
  computed in `EOHandTriangleView initWithKind:` from `[EOClock clockCenter]`
  and `roundOutFrameToIntegralBoundaries`, producing a sub-pixel-snapped
  `zeroOffset`. The port does not reproduce this UIKit layout / pixel snapping;
  the caller supplies `centerX`/`centerY` directly. This only affects sub-pixel
  placement, not geometry.
- **A4 — The Y-axis flip and why the port applies none.** UIKit's `drawRect:`
  context originates at the view's top-left and increases Y downward (Apple,
  *Drawing and Printing Guide for iOS*). `setupContextForZeroOffsetAndScale`
  then post-multiplies `scale(scale, -scale)`, flipping Y back to Y-up; the
  triangle view's own `CGContextScaleCTM(context, 1, -1)` flips it back to Y-down.
  The **net** result is `scale(scale, scale)` in UIKit's Y-down device space
  (the two `-1` factors cancel: `(-scale) * (-1) = +scale`). HTML canvas is also
  natively Y-down, so reproducing the **net** transformation requires only
  `translate(centerX, centerY)` + `scale(masterScale, masterScale)` with no
  explicit flip. A literal `scale(1, -1)` in canvas would flip geometry relative
  to canvas's baseline and produce an upside-down hand. Consequences: at
  `angle = 0`, `cgAngle = -halfPi`, the tip sits at `(0, -length)` → rendered
  upward on screen (12 o'clock); increasing `angle` sweeps the hand clockwise,
  which matches normal clock behavior.
- **A5 — `angle` semantics.** `angle` is in radians and uses the same convention
  as the source's `angle` ivar. The `cgAngle = angle − halfPi` relationship is
  preserved verbatim. The hand is drawn with `angle` baked into the polygon
  (no `ctx.rotate`), matching the source which (for triangle views) skips the
  `CATransform3DMakeRotation` layer rotation and instead rebuilds the path.
- **A6 — Tail fraction.** `TAILFRACTION = 0.21` is hard-coded as in the source.
- **A7 — Stroke joins/caps.** The source never sets line joins/caps; CG defaults
  are miter join and butt cap, which match canvas defaults. The port sets them
  explicitly for strict parity.
- **A8 — Closing the path.** The source's last `CGContextAddLineToPoint` returns
  to the start vertex and then calls `CGContextDrawPath` (which implicitly
  closes for fill). The port emits the same explicit `lineTo` back to the first
  vertex and additionally calls `ctx.closePath()` for a clean miter at the
  seam; this is functionally equivalent.
- **A9 — Antialiasing.** The parent `EOHandView drawRect:` sets
  `CGContextSetShouldAntialias(context, YES)` and
  `CGContextSetAllowsAntialiasing(context, YES)`. Canvas antialiases by default
  and exposes no equivalent toggle, so the port relies on canvas's default AA.
- **A10 — Fill rule.** CG `kCGPathFill` / `kCGPathFillStroke` use the non-zero
  winding rule by default; `ctx.fill()` defaults to `"nonzero"` too, so the
  fill rule matches without extra arguments.
- **A11 — Strict TypeScript.** The module targets `--strict`: all options are
  typed via `TriangleHandOptions`, optionals are declared with `?`, and
  defaults are applied with `??`. There is no validation that `length`/`width`
  are finite non-negative — garbage in, garbage out, mirroring how the C++
  source would pass garbage straight to `CGContextMoveToPoint`.
- **A12 — Line width under scale.** Canvas scales the rendered stroke width by
  the active CTM, so `ctx.lineWidth = width / 10` under `scale(masterScale, …)`
  renders at `(width/10) * masterScale` device pixels — identical to CG
  drawing with `CGContextSetLineWidth(context, width/10)` inside a CTM scaled by
  `masterScale`.
- **A13 — Self-contained.** No external dependencies; `CanvasRenderingContext2D`
  is the only ambient lib reference (DOM lib), consistent with a canvas
  rendering module.