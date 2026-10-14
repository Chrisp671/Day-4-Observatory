# Triangle-Hand Calibration Notes

## Source files analysed

| File | Role |
|------|------|
| `Classes/EOHandTriangleView.mm` | Subclass that draws the triangle hand |
| `Classes/EOHandTriangleView.h` | Header (inherits `EOHandView`) |
| `Classes/EOHandView.h` | Base-class header — declares `length`, `width`, `angle`, colours |
| `Classes/EOHandView.mm` | Base-class impl — `update` method, layer-rotation logic |
| `Classes/Constants.h` | `#define halfPi (M_PI/2)`, `pi`, `twoPi` |

## Geometry summary (from `EOHandTriangleView.mm:39-65`)

The polygon is an **isososceles triangle with a short tail**, drawn
relative to a pivot at `(0, 0)`:

| Vertex | Obj-C expression (after y-flip) | Description |
|--------|----------------------------------|-------------|
| Left base | `( width/2·sin(cgAngle),  width/2·cos(cgAngle))` | Base edge, CW side |
| Tip | `(length·cos(cgAngle), –length·sin(cgAngle))` | Forward point |
| Right base | `(–width/2·sin(cgAngle), –width/2·cos(cgAngle))` | Base edge, CCW side |
| Tail | `(–tail·cos(cgAngle),  tail·sin(cgAngle))` | Short backward stub |

Where `cgAngle = angle – π/2` and `tail = length × 0.21` (`TAILFRACTION`).

## CG → Canvas mapping

| Core Graphics call | Canvas equivalent | Notes |
|--------------------|-------------------|-------|
| `CGContextSaveGState` / `RestoreGState` | `ctx.save()` / `ctx.restore()` | Direct 1-to-1 mapping |
| `CGContextScaleCTM(ctx, 1, -1)` | `angle = -angle` (negate input) | CG flips y so positive is up; canvas y already points down. Negating the caller's angle and swapping the sin/cos signs reproduces the same visual. See derivation below. |
| `CGContextSetLineWidth(ctx, width/10)` | `ctx.lineWidth = width / 10` | Direct mapping |
| `[strokeColor setStroke]` | `ctx.strokeStyle = strokeColor` | Both accept CSS-colour strings |
| `[fillColor setFill]` (with fallback to stroke) | `ctx.fillStyle = fillColor ?? strokeColor` | Obj-C: `if (fillColor) { [fillColor setFill]; } else { [strokeColor setFill]; }` |
| `CGContextMoveToPoint` | `ctx.moveTo` | Direct mapping |
| `CGContextAddLineToPoint` | `ctx.lineTo` | Direct mapping |
| `CGContextDrawPath(ctx, kCGPathFillStroke)` | `ctx.fill()` then `ctx.stroke()` | Canvas has no single `fillStroke` op; calling both in sequence produces identical output because the path is closed before either call. |
| `CGContextSetShouldAntialias` / `AllowsAntialiasing` | *(not mapped)* | Canvas anti-aliases by default; no explicit control needed for this shape. |

## Angle convention — full derivation

### Source convention

* `angle` is a **maths-convention** angle: 0 = +x axis (3-o'clock),
  increases **counter-clockwise**, y-axis points **up**.
* `cgAngle = angle − π/2` rotates for Core Graphics' default
  orientation before the y-flip.
* `CGContextScaleCTM(ctx, 1, −1)` flips the y-axis so that
  `sin(cgAngle)` appears as *positive-y-up* on screen.

### Canvas convention

* Canvas y-axis points **down**.
* `canvasAngle = −angle` (negate) so that a positive `angle` (CCW in
  maths) maps to the same visual direction on screen.

### Vertex verification (angle = 0 → hand points right)

| Vertex | Obj-C after y-flip | Canvas (`a = 0`) | Match? |
|--------|-------------------|------------------|--------|
| Left base | `(0, w/2)` | `(0, w/2)` | ✅ |
| Tip | `(L, 0)` | `(L, 0)` | ✅ |
| Right base | `(0, −w/2)` | `(0, −w/2)` | ✅ |
| Tail | `(−t, 0)` | `(−t, 0)` | ✅ |

### Vertex verification (angle = π/2 → hand points up on screen)

| Vertex | Obj-C after y-flip | Canvas (`a = −π/2`) | Match? |
|--------|-------------------|---------------------|--------|
| Left base | `(w/2, 0)` | `(w/2, 0)` | ✅ |
| Tip | `(0, L)` | `(0, L)` | ✅ |
| Right base | `(−w/2, 0)` | `(−w/2, 0)` | ✅ |
| Tail | `(0, −t)` | `(0, −t)` | ✅ |

## Assumptions

1. **Colour strings**: The caller provides CSS-compatible colour strings
   (e.g. `"#ff0000"`, `"rgb(255,0,0)"`, `"red"`).  The Obj-C code uses
   `UIColor` objects which map to the same CSS strings the browser
   understands.

2. **Transform context**: The caller is responsible for setting
   `ctx.translate(x, y)` (and any additional scale/rotation) before
   calling `drawTriangleHand`.  The function draws relative to the
   current origin.

3. **`TAILFRACTION` constant**: Hard-coded to `0.21` as defined in
   `EOHandTriangleView.mm:16`.  Not exposed as a parameter.

4. **`setupContextForZeroOffsetAndScale`**: This Obj-C helper (from the
   base class) sets up a coordinate transform so the hand's local
   origin aligns with the view centre and applies `masterScale`.  In
   the canvas port the caller handles positioning/scaling externally;
   `drawTriangleHand` draws in local coordinates from `(0, 0)`.

5. **No `kCGPathFillStroke` equivalent**: Canvas requires separate
   `fill()` and `stroke()` calls.  Because the path is closed and the
   state is saved/restored, the visual output is identical to CG's
   single `kCGPathFillStroke` composite operation.

6. **Line width**: Uses `width / 10` exactly as the source.  No
   scaling or device-pixel-ratio adjustment is applied inside this
   function.

7. **`halfPi` / `pi`**: Defined as `Math.PI / 2` and `Math.PI`
   respectively — matching the Obj-C `#define halfPi (M_PI/2)` and
   `#define pi M_PI` in `Constants.h:19-21`.
