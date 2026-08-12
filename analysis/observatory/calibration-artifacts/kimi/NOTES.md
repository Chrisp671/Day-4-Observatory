# Triangle Hand Canvas Port Notes

This file maps the Core Graphics calls from `Classes/EOHandTriangleView.mm` to
their HTML Canvas equivalents and lists the assumptions made in
`calibration/triangle-hand.ts`.

## Core Graphics → Canvas mapping

| Objective-C / Core Graphics | Canvas equivalent | Notes |
|----------------------------|-------------------|-------|
| `CGContextSaveGState(context)` | `ctx.save()` | Saves the current transform/styles. |
| `CGContextRestoreGState(context)` | `ctx.restore()` | Restores the saved context state. |
| `setupContextForZeroOffsetAndScale(context, &zeroOffset, masterScale);` | `ctx.translate(x, y); ctx.scale(scale, -scale);` | The original translates the view center (`zeroOffset`) and scales with a Y flip. The module exposes `x`, `y`, and `scale` options for this. |
| `CGContextScaleCTM(context, 1, -1);` | `ctx.scale(1, -1);` | Explicit Y-axis flip from the triangle view. Combined with the previous `scale(scale, -scale)`, the net effect is `scale(scale, scale)`. |
| `double cgAngle = angle - halfPi;` | `const cgAngle = angle - Math.PI / 2;` | Same angle conversion is preserved exactly. |
| `[strokeColor setStroke];` | `ctx.strokeStyle = strokeColor;` | Colors are passed as CSS color strings. |
| `[fillColor setFill];` / `[strokeColor setFill];` | `ctx.fillStyle = fillColor ?? strokeColor;` | When no fill color is supplied, the fill falls back to the stroke color, matching the original behavior. |
| `CGContextSetLineWidth(context, width/10);` | `ctx.lineWidth = width / 10;` | Line width is set in user units, just like Core Graphics. |
| `CGContextMoveToPoint(context, x, y);` | `ctx.moveTo(x, y);` | |
| `CGContextAddLineToPoint(context, x, y);` | `ctx.lineTo(x, y);` | |
| `CGContextDrawPath(context, kCGPathFillStroke);` | `ctx.fill(); ctx.stroke();` | Fills the path then strokes it. |
| `#define TAILFRACTION 0.21` | `const TAIL_FRACTION = 0.21;` | Hard-coded tail length ratio is preserved. |

## Assumptions

1. **Canvas coordinate system** — The function assumes the supplied context uses
   the standard HTML Canvas coordinate system (origin at top-left, Y increasing
   downward).  Because the original applies two Y flips that cancel, the hand is
   drawn in a Y-down user space, so no additional flipping is required beyond
   explicitly reproducing those two scale calls.

2. **Angle units and convention** — `angle` is supplied in radians and has the
   same meaning as the Objective-C `angle` property.  The `cgAngle = angle -
   halfPi` conversion means an `angle` of `0` draws the hand pointing up
   (12 o'clock position).

3. **Center and scale** — `x` and `y` are the rotation center in canvas pixels,
   equivalent to the original view's zero point.  `scale` is the uniform
   `masterScale` factor; it defaults to `1.0`.

4. **Color strings** — `strokeColor` and `fillColor` are CSS color strings
   (e.g., `"black"`, `"#ff0000"`, `"rgba(0,0,0,0.5)"`).  No UIColor conversion is
   performed.

5. **No pixel-snapping** — The original `roundOutFrameToIntegralBoundaries`
   routine adjusts the view frame and `zeroOffset` to land on integral pixels.
   This layout step is not reproduced; the caller supplies the exact center and
   scale.

6. **Fill rule** — The polygon is simple and convex enough that Canvas's default
   non-zero fill rule matches Core Graphics behavior.

7. **Antialiasing** — Canvas antialiasing is left at its default, which produces
   results comparable to the Core Graphics antialiased rendering used elsewhere
   in the app.
