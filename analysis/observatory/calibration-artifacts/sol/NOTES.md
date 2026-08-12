# Triangle hand calibration notes

## Geometry and angle

`EOHandTriangleView` draws one four-vertex polygon around the hand pivot:

1. One side of the arm at radius `width / 2` and angle `cgAngle - pi / 2`.
2. The tip at radius `length` and angle `cgAngle`.
3. The other side at radius `width / 2` and angle `cgAngle + pi / 2`.
4. The tail at radius `length * 0.21` and angle `cgAngle + pi`.
5. A final line back to the first point.

The public `angle` is the value calculated by `EOHandView`. The drawing angle is
`cgAngle = angle - pi / 2`. With the complete source transform, `angle = 0`
therefore points toward the top of a normal canvas and positive angles turn
clockwise.

## Core Graphics to canvas

| Core Graphics source | Canvas equivalent |
| --- | --- |
| `UIGraphicsGetCurrentContext()` | The caller supplies `CanvasRenderingContext2D`. |
| `CGContextSaveGState(context)` | `ctx.save()` |
| `setupContextForZeroOffsetAndScale(...)` translation | `ctx.translate(opts.x, opts.y)` |
| Helper's `CGContextScaleCTM(context, masterScale, -masterScale)` | `ctx.scale(1, -1)` for the assumed unit scale |
| `CGContextScaleCTM(context, 1, -1)` | A second `ctx.scale(1, -1)` |
| `[strokeColor setStroke]` | `ctx.strokeStyle = opts.strokeColor` |
| `[fillColor setFill]` | `ctx.fillStyle = opts.fillColor` |
| `[strokeColor setFill]` when fill is nil | `ctx.fillStyle = opts.fillColor ?? opts.strokeColor` |
| `CGContextSetLineWidth(context, width / 10)` | `ctx.lineWidth = opts.width / 10` |
| `CGContextMoveToPoint(...)` | `ctx.beginPath(); ctx.moveTo(...)` |
| `CGContextAddLineToPoint(...)` | `ctx.lineTo(...)` |
| `CGContextDrawPath(context, kCGPathFillStroke)` | `ctx.fill(); ctx.stroke()` |
| `CGContextRestoreGState(context)` | `ctx.restore()` |

The two Y-axis scales are intentional. `setupContextForZeroOffsetAndScale`
changes the UIKit drawing coordinates to y-up, while the triangle-specific
`CGContextScaleCTM(context, 1, -1)` changes them back. Their Y transforms cancel.
Keeping both operations in the port records the source's explicit flip and makes
the angle behavior unambiguous.

## Assumptions

- `x` and `y` are the final canvas-space pivot. The Objective-C initializer's
  clock-center addition, negated `ay`, view frame, and fractional `zeroOffset`
  are layout concerns and are expected to be resolved by the caller.
- Length and width are finite canvas-unit values. As in the source, this module
  does not validate or clamp dimensions or angles.
- The source `masterScale` is treated as `1`. A caller needing display scaling
  can transform the context before calling; `save()` and `restore()` preserve
  that incoming transform.
- Canvas paints (`string`, `CanvasGradient`, or `CanvasPattern`) stand in for
  `UIColor`. CSS color parsing and color-space conversion are left to the
  browser.
- Both an omitted fill and an explicit `null` mean no separate fill color, so
  the stroke color is reused. Empty strings are retained as supplied rather than
  treated as missing.
- The source explicitly adds a line back to the first point instead of calling
  a close-path API. The module does the same rather than using `ctx.closePath()`.
- Canvas fills before strokes to match `kCGPathFillStroke`, with the stroke
  centered on the polygon boundary and the browser's current default join and
  cap behavior left unchanged, as the source does not set either property.
- Antialiasing is browser-controlled. The triangle source does not set an
  antialiasing option in its own `drawRect:` implementation.
