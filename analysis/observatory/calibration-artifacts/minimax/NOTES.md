# Triangle hand port — calibration notes

Source: `Classes/EOHandTriangleView.mm` (the `EOHandTriangleView` subclass's
`-drawRect:` at lines 39-65, with supporting state from `EOHandView.h` /
`EOHandView.mm`).

Target: `calibration/triangle-hand.ts`, a dependency-free, strict-mode
TypeScript module exporting `drawTriangleHand(ctx, opts)`.

## 1. Core Graphics call → canvas API mapping

Every line that produces visible output in the source is mapped 1:1 below;
line numbers refer to `EOHandTriangleView.mm`.

| # | Source (Core Graphics / UIKit)                          | Canvas equivalent                                  | Notes |
|---|----------------------------------------------------------|----------------------------------------------------|-------|
| 1 | `UIGraphicsGetCurrentContext()` (l. 40)                  | the `ctx` argument supplied to `drawTriangleHand`  | Caller owns the context, mirroring the host's `UIGraphicsGetCurrentContext`. |
| 2 | `CGContextSaveGState(context)` (l. 41)                   | `ctx.save()`                                       | Identical semantics. |
| 3 | `setupContextForZeroOffsetAndScale(context, &zeroOffset, masterScale)` (l. 44) | `ctx.translate(cx, cy)` | Places the local origin at the clock center. We do **not** replicate the `masterScale` factor or the `zeroOffset` drag offset — see assumptions §3. |
| 4 | `CGContextScaleCTM(context, 1, -1)` (l. 45)              | `ctx.scale(1, -1)`                                 | Y-axis flip so that Y-up trig math renders into a Y-down canvas. |
| 5 | `[strokeColor setStroke]` (l. 47)                        | `ctx.strokeStyle = strokeColor`                    | Caller provides a CSS color string. |
| 6 | `if (fillColor) [fillColor setFill]; else [strokeColor setFill];` (l. 48-52) | `ctx.fillStyle = opts.fillColor ?? strokeColor` | Exact same fallback when `fillColor` is absent. |
| 7 | `CGContextSetLineWidth(context, width/10)` (l. 55)       | `ctx.lineWidth = width / 10`                       | Direct arithmetic match. |
| 8 | `CGContextMoveToPoint(context, w/2*cos(cgA-halfPi), w/2*sin(cgA-halfPi))` (l. 56) | `ctx.moveTo(leftX, leftY)` | Left shoulder vertex; uses Y-up math. |
| 9 | `CGContextAddLineToPoint(context, L*cos(cgA), L*sin(cgA))` (l. 57) | `ctx.lineTo(tipX, tipY)`                          | Tip vertex. |
| 10 | `CGContextAddLineToPoint(context, w/2*cos(cgA+halfPi), w/2*sin(cgA+halfPi))` (l. 58) | `ctx.lineTo(rightX, rightY)` | Right shoulder vertex. |
| 11 | `CGContextAddLineToPoint(context, L*TAILFRACTION*cos(cgA+pi), L*TAILFRACTION*sin(cgA+pi))` (l. 60) | `ctx.lineTo(tailX, tailY)` | Tail vertex, at `TAILFRACTION = 0.21` of the way back from the center. |
| 12 | `CGContextAddLineToPoint(context, w/2*cos(cgA-halfPi), w/2*sin(cgA-halfPi))` (l. 61) | `ctx.closePath()` | The source explicitly re-adds the first vertex as a 5th line segment. `closePath()` draws the same implicit closing segment, with a correct `lineJoin` at the closing corner; visually identical for the simple polygon. |
| 13 | `CGContextDrawPath(context, kCGPathFillStroke)` (l. 62)  | `ctx.fill(); ctx.stroke();`                        | `kCGPathFillStroke` performs fill then stroke in a single pass; canvas requires two calls in the same order. |
| 14 | `CGContextRestoreGState(context)` (l. 64)                | `ctx.restore()`                                    | Identical semantics. |

## 2. Angle convention

The source stores its public angle with zero at 12 o'clock (e.g.
`angle = now * twoPi/60` for a seconds hand) and then computes
`cgAngle = angle - halfPi` at EOHandTriangleView.mm:43 before doing any
trig. We expose **`angle` as the public option (the source's value)** and
perform the `cgAngle = angle - halfPi` adjustment inside the function.
The user supplies whatever value the source would have stored in its
`angle` member.

## 3. Y-axis flip

The original applies `CGContextScaleCTM(context, 1, -1)` so the trig math
(plain `cos`/`sin` of a Y-up polar angle) renders correctly into CG's
Y-down screen space. We mirror this with `ctx.scale(1, -1)` *after*
`ctx.translate(cx, cy)`, leaving the trig math in the file byte-for-byte
identical to the source. An equivalent alternative — pre-negating every Y
coordinate and skipping the transform — was rejected in favor of a more
faithful 1:1 mapping.

## 4. Geometry recap

A 4-vertex closed polygon, in source order:

1. Left shoulder at radius `width/2` at angle `cgAngle - halfPi`.
2. Tip at radius `length` at angle `cgAngle`.
3. Right shoulder at radius `width/2` at angle `cgAngle + halfPi`.
4. Tail at radius `length * 0.21` at angle `cgAngle + pi` (i.e. on the
   opposite side of the pivot from the tip).

The polygon is closed back to vertex 1 and rendered as
`fill` + `stroke` with `lineWidth = width / 10`.

## 5. Assumptions made

1. **Caller-owned context.** We do not call `UIGraphicsGetCurrentContext()`
   (no canvas equivalent); the caller passes a `CanvasRenderingContext2D`
   already bound to the target `<canvas>`.
2. **No implicit global transform.** The source is invoked from a
   `UIView` whose `drawRect:` runs under a CTM set up by the host view
   hierarchy (and additionally by `setupContextForZeroOffsetAndScale`).
   We replace that with a single `ctx.translate(cx, cy)`; we do **not**
   apply a `masterScale`. The caller is expected to pass `length` and
   `width` in the same unit space they want on screen, and to apply any
   view-level scaling to the context before calling `drawTriangleHand`.
3. **`zeroOffset` is ignored.** The `zeroOffset` parameter to
   `setupContextForZeroOffsetAndScale` encodes an interactive drag
   offset; the triangle hand is a passive indicator and no equivalent is
   needed in the calibration module.
4. **`fillColor` fallback.** When `opts.fillColor` is `undefined`, the
   source falls back to `[strokeColor setFill]`. We mirror that exactly
   via `opts.fillColor ?? strokeColor`.
5. **Color strings, not `UIColor`.** `strokeColor` / `fillColor` are CSS
   color strings (e.g. `"#ff8800"`, `"rgba(0,0,0,0.5)"`), not Objective-C
   `UIColor*` objects. The `??` fallback therefore operates on plain
   strings.
6. **TAILFRACTION is hard-coded to 0.21** to match the source's `#define`
   (EOHandTriangleView.mm:16). It is not exposed as an option.
7. **No antialiasing toggle.** The source's `EOHandTriangleView -drawRect:`
   does not call `CGContextSetShouldAntialias` / `SetAllowsAntialiasing`;
   canvas antialiasing is on by default. We leave it alone.
8. **No `lineCap` / `lineJoin` override.** The source doesn't set them;
   canvas defaults (`butt` / `miter`) match Core Graphics defaults.
9. **Path fill rule is `nonzero` in both APIs** (CG default; canvas
   `ctx.fillRule` default). No change required.
10. **Closing the path.** The source explicitly repeats vertex 1 as a 5th
    `CGContextAddLineToPoint`. We use `ctx.closePath()` instead, which
    produces the same visual result and yields a correct `lineJoin` at
    the closing corner. This is the one structural deviation from the
    source and is intentional (idiomatic canvas).
11. **No `beginPath()` of a stale prior sub-path.** We call
    `ctx.beginPath()` before `moveTo`. Canvas would implicitly start a
    new sub-path on the next `moveTo`, but being explicit is safer when
    the caller's context may have leftover path state.
12. **Units are radians for `angle`**, matching the source's `angle`
    member (which is built up from `now * twoPi/60` etc. in
    `EOHandView.mm`'s `update` method).
13. **`cx` / `cy` are in canvas device pixels**, i.e. the same space the
    rest of the canvas content lives in. The `translate(cx, cy)` then
    `scale(1, -1)` sequence means: a local Y-up point `(0, length)` is
    drawn at canvas device `(cx, cy - length)` — i.e. straight up the
    screen when `angle === halfPi` (which the source's `angle = halfPi`
    initializer in `EOHandView.mm:81` confirms is the 12-o'clock pose).
