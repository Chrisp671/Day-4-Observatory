# Triangle Hand Calibration Notes

## Core Graphics → Canvas API Mapping

| Core Graphics Call (EOHandTriangleView.mm) | Canvas Equivalent | Notes |
|---|---|---|
| `UIGraphicsGetCurrentContext()` | `ctx` parameter passed to function | Caller provides the 2D context |
| `CGContextSaveGState(context)` | `ctx.save()` | |
| `CGContextScaleCTM(context, 1, -1)` | `ctx.scale(1, -1)` | Flips Y axis so positive Y = up within the hand's local drawing |
| `[strokeColor setStroke]` | `ctx.strokeStyle = strokeColor` | CG colors are UIColor objects; canvas uses CSS color strings |
| `[fillColor setFill]` | `ctx.fillStyle = fillColor` | |
| `[strokeColor setFill]` (fallback) | `ctx.fillStyle = strokeColor` | When `fillColor` is nil, fill uses stroke color |
| `CGContextSetLineWidth(context, width/10)` | `ctx.lineWidth = width / 10` | |
| `CGContextMoveToPoint(context, x, y)` | `ctx.moveTo(x, y)` | Must be inside `beginPath()`/`closePath()` |
| `CGContextAddLineToPoint(context, x, y)` | `ctx.lineTo(x, y)` | |
| `CGContextDrawPath(context, kCGPathFillStroke)` | `ctx.fill()` then `ctx.stroke()` | Canvas separates fill and stroke; order matters: fill first for correct overlap |
| `CGContextRestoreGState(context)` | `ctx.restore()` | |

## Polygon Geometry

The source draws a 5-vertex closed polygon:

```
P1 = base_left  = (width/2 * cos(cgAngle - halfPi),  width/2 * sin(cgAngle - halfPi))
P2 = tip        = (length * cos(cgAngle),             length * sin(cgAngle))
P3 = base_right = (width/2 * cos(cgAngle + halfPi),  width/2 * sin(cgAngle + halfPi))
P4 = tail       = (TAILFRACTION * length * cos(cgAngle + pi), TAILFRACTION * length * sin(cgAngle + pi))
P5 = close back to P1
```

The base (P1-P3) is horizontal and perpendicular to the tip direction, centered at the origin. The tail extends opposite the tip for `TAILFRACTION * length` (0.21 of the tip length).

## Angle Convention

- **Input `angle`**: 0 = 12 o'clock (pointing up), increasing clockwise (matches source's `angle` ivar)
- **Source's internal**: `cgAngle = angle - halfPi` converts the clock angle to standard math angle (0 = right, increasing CCW) in a Y-down coordinate system
- **Our internal**: `cgAngle = halfPi - angle` — because we apply `ctx.scale(1, -1)` (Y up) but the source's net coordinate system after the double Y-flip ends up Y-down. Our single flip leaves Y up, so the angle direction is reversed to produce the same visual tip direction.

## Y-Axis Flip Chain

The source applies two Y-flips total:
1. `setupContextForZeroOffsetAndScale` → `CGContextScaleCTM(context, scale, -scale)` — first Y-flip (Y points up)
2. `EOHandTriangleView.drawRect` → `CGContextScaleCTM(context, 1, -1)` — second Y-flip (Y points down again)

Net effect: Y points down in the drawing coordinate system (same as CG and canvas defaults).

Our function reproduces the second flip (`ctx.scale(1, -1)`) but not the first. The first flip is the caller's responsibility (part of `setupContextForZeroOffsetAndScale` which translates to center and applies scale). Since our function only applies one flip, the internal coordinate system has Y up (not Y down as in the source's net).  We compensate with `cgAngle = halfPi - angle`.

## Assumptions

1. **Origin at center**: The caller translates the context so (0, 0) is at the center of the clock face before calling `drawTriangleHand`.  This corresponds to the translation portion of `setupContextForZeroOffsetAndScale` in the source.

2. **No pre-scaling assumed**: The `masterScale` from the source's `setupContextForZeroOffsetAndScale` is the caller's responsibility.  Our function does not apply any uniform scale.

3. **Canvas default coordinate system**: We assume the canvas context has not been previously flipped (Y increases downward), matching the state before `setupContextForZeroOffsetAndScale` runs in the source.

4. **Colors are CSS strings**: Unlike the UIColor objects in the source, our `strokeColor` and `fillColor` are CSS-compatible color strings (hex, rgb(), named colors, etc.).

5. **Line width formula**: The source uses `width/10`. We reproduce this exactly.  This means the stroke extends `width/20` outward and `width/20` inward from the polygon edge (center-stroked).

6. **Fill before stroke**: Canvas requires separate `fill()` and `stroke()` calls. We fill first, then stroke, matching the `kCGPathFillStroke` behavior where the stroke is drawn on top of the fill.

7. **TAILFRACTION**: The constant 0.21 comes from the source's `#define TAILFRACTION 0.21`. We hardcode the same value.

8. **No antialiasing control**: The source's base `EOHandView` enables `CGContextSetShouldAntialias`/`CGContextSetAllowsAntialiasing`, but our function operates at the shape level. Antialiasing is controlled by the canvas context settings.
