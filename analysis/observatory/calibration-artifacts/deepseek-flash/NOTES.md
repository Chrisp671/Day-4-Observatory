# Triangle Hand Port: Core Graphics -> Canvas

Ports `EOHandTriangleView -drawRect:` (`Classes/EOHandTriangleView.mm:39-65`) to
TypeScript. Supporting context read from `Classes/EOHandView.h`,
`Classes/EOHandView.mm` (angle source / `update()`), `Classes/EOScheduledView.mm`
(`setupContextForZeroOffsetAndScale`), and `Classes/Constants.h` (`pi`, `twoPi`,
`halfPi`).

## CG call -> canvas equivalent

| Core Graphics (source) | Canvas (port) |
| --- | --- |
| `UIGraphicsGetCurrentContext()` | `ctx` argument passed to `drawTriangleHand` |
| `CGContextSaveGState(context)` | `ctx.save()` |
| `CGContextTranslateCTM(context, zeroOffset.x, zeroOffset.y)` (via `setupContextForZeroOffsetAndScale`) | `ctx.translate(x, y)` with `x,y` = hand center |
| `CGContextScaleCTM(context, masterScale, -masterScale)` (via `setupContextForZeroOffsetAndScale`, `masterScale == 1.0`) | Canvas's native y-down orientation (see assumption A1) |
| `CGContextScaleCTM(context, 1, -1)` | `ctx.scale(1, -1)` |
| `[strokeColor setStroke]` | `ctx.strokeStyle = opts.strokeColor` |
| `[fillColor setFill]` / `[strokeColor setFill]` | `ctx.fillStyle = opts.fillColor ?? opts.strokeColor` |
| `CGContextSetLineWidth(context, width/10)` | `ctx.lineWidth = opts.width / 10` |
| `CGContextMoveToPoint` | `ctx.moveTo` |
| `CGContextAddLineToPoint` | `ctx.lineTo` |
| `AddLineToPoint(...)` back to first point (line 61) | `ctx.closePath()` |
| `CGContextDrawPath(context, kCGPathFillStroke)` | `ctx.fill(); ctx.stroke();` (fill, then stroke) |
| `CGContextRestoreGState(context)` | `ctx.restore()` |

`halfPi` (`M_PI/2`) and `pi` (`M_PI`) come from `Constants.h:19-21`.
`TAILFRACTION = 0.21` is defined at `EOHandTriangleView.mm:16`.

## Geometry

The angle received from the clock (`EOHandView.angle`, set in
`update()` / `Classes/EOHandView.mm:166-447`) is re-derived:

```
cgAngle = angle - halfPi;            // EOHandTriangleView.mm:43
```

Polygon vertices (pre-transform coordinates, standard math convention,
y-up), in draw order:

```
P1 = (width/2 * cos(cgAngle - halfPi), width/2 * sin(cgAngle - halfPi))   // trailing base corner
P2 = (length  * cos(cgAngle),          length  * sin(cgAngle))            // arm tip
P3 = (width/2 * cos(cgAngle + halfPi), width/2 * sin(cgAngle + halfPi))   // leading base corner
P4 = (length*TAILFRACTION * cos(cgAngle + pi), length*TAILFRACTION * sin(cgAngle + pi))  // tail vertex
```

`P1 -> P2 -> P3 -> P4 -> P1` closes a kite: a pointed arm of length `length`
flanked by two base corners at radius `width/2` perpendicular to the arm, plus a
tail of length `length * 0.21` opposite the arm. The shape is filled and stroked
(`kCGPathFillStroke`); line width is `width/10`; the fill uses `fillColor` when
given, otherwise falls back to `strokeColor`.

For a triangle hand (`EOHandTriangleView` is not a layer-rotated hand:
`rotateLayer` is false, `EOHandView.mm:154`), `update()` only calls
`setNeedsDisplay` and `angle` is consumed here in `drawRect`.

## Assumptions

A1. **Y-axis flip (the `CGContextScaleCTM(context, 1, -1)` on line 45).**
    This call is reproduced verbatim as `ctx.scale(1, -1)`. Note that the
    surrounding setup already flipped Y once: `setupContextForZeroOffsetAndScale`
    applies `scale(1, -1)` (`EOScheduledView.mm:45`) with `masterScale == 1.0`.
    The two flips cancel, so the iOS app renders the math-coordinate polygon
    un-flipped in a center-origin, y-down space (arm tip points "up" / 12
    o'clock at `angle = 0`). The canvas is natively y-down, so it stands in for
    the setupContext flip; the verbatim single `ctx.scale(1,-1)` therefore
    produces a vertically mirrored image of the iOS on-screen output (tip points
    "down" at `angle = 0`). This keeps the port a faithful line-for-line copy of
    `drawRect`. To match app pixels exactly, drop the `ctx.scale(1, -1)` line —
    the two source flips cancel.

A2. **Positioning.** The module takes the hand center `(x, y)` directly. The
    source derives it as the view-frame center
    `(ax + clockCenter.x - sz, -ay + clockCenter.y - sz)`, size `2*sz x 2*sz`
    with `sz = fmax(length, width)` (`EOHandTriangleView.mm:19-29`), and
    `setupContextForZeroOffsetAndScale` translates the CTM by that center
    (`zeroOffset`). The `-ay` in the frame y is a coordinate-system flip applied
    when the view is placed in the clock; the caller must supply the already
    resolved center.

A3. **Fill falls back to stroke.** `UIColor` nil vs non-nil maps to an optional
    `fillColor?: string`; when absent the stroke color is used (`??`), matching
    `if (fillColor) { [fillColor setFill]; } else { [strokeColor setFill]; }`.

A4. **Colors.** UIKit `UIColor` colors are passed as CSS color strings. The
    caller must convert `[UIColor colorWithRed:... alpha:...]` values to `rgba()`.

A5. **Stroke style defaults.** CG and Canvas both default to a stroke centered
    on the path with `miter` joins and `butt` caps, which matches the source
    (no `CGContextSetLineJoin`/`LineCap` calls). Default canvas antialiasing
    (on) matches the app's default rendering.

A6. **Fill/stroke order.** `kCGPathFillStroke` fills then strokes the same
    path, so the port calls `ctx.fill()` before `ctx.stroke()`.

A7. **`width` is the base width, not line width.** The hand's overall width
    parameter drives both the base-corner radius (`width/2`) and the stroke
    (`width/10`), exactly as in the source.
