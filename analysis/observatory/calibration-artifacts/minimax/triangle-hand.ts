/**
 * Canvas port of the triangle clock hand from
 * Classes/EOHandTriangleView.mm (see that file for the original Objective-C++
 * implementation; mapping is documented in calibration/NOTES.md).
 *
 * The hand is drawn as a 4-vertex closed polygon (arrow / kite with a short
 * rear tail) at the view's local origin, with a stroke outline. The fill
 * falls back to the stroke color when no separate fill color is given, and
 * a Y-axis flip is applied via the canvas transform to mirror the original's
 * CGContextScaleCTM(context, 1, -1) at EOHandTriangleView.mm:45.
 */

export interface TriangleHandOptions {
  /**
   * The hand's *source* angle in radians — i.e. the value the original
   * `EOHandTriangleView` would hold in its `angle` member before the
   * internal `cgAngle = angle - halfPi` adjustment (EOHandTriangleView.mm:43).
   * The function performs that adjustment internally.
   */
  angle: number;

  /** Length from the pivot to the tip of the hand, in canvas units. */
  length: number;

  /** Width of the hand at its widest point, in canvas units. */
  width: number;

  /** Canvas-space x of the hand's pivot (the clock center). */
  cx: number;

  /** Canvas-space y of the hand's pivot (the clock center). */
  cy: number;

  /** Stroke color (any valid CSS color string). */
  strokeColor: string;

  /**
   * Optional fill color. When omitted, the original falls back to the
   * stroke color for the fill (EOHandTriangleView.mm:48-52) — we mirror
   * that behavior.
   */
  fillColor?: string;
}

const TAILFRACTION = 0.21;
const HALF_PI = Math.PI / 2;
const PI = Math.PI;

export function drawTriangleHand(
  ctx: CanvasRenderingContext2D,
  opts: TriangleHandOptions,
): void {
  const { angle, length, width, cx, cy, strokeColor } = opts;
  const fillColor = opts.fillColor ?? strokeColor;

  // Source: double cgAngle = angle-halfPi;  (EOHandTriangleView.mm:43)
  const cgAngle = angle - HALF_PI;

  // Vertex layout, exactly matching EOHandTriangleView.mm:56-61:
  //   1) left shoulder: (w/2 cos(cgA - halfPi), w/2 sin(cgA - halfPi))
  //   2) tip:           (L   cos(cgA),         L   sin(cgA))
  //   3) right shoulder:(w/2 cos(cgA + halfPi), w/2 sin(cgA + halfPi))
  //   4) tail:          (L*TAILFRACTION cos(cgA + pi), L*TAILFRACTION sin(cgA + pi))
  //   5) back to vertex 1 to close.
  const leftX  = (width / 2) * Math.cos(cgAngle - HALF_PI);
  const leftY  = (width / 2) * Math.sin(cgAngle - HALF_PI);
  const tipX   = length      * Math.cos(cgAngle);
  const tipY   = length      * Math.sin(cgAngle);
  const rightX = (width / 2) * Math.cos(cgAngle + HALF_PI);
  const rightY = (width / 2) * Math.sin(cgAngle + HALF_PI);
  const tailX  = length * TAILFRACTION * Math.cos(cgAngle + PI);
  const tailY  = length * TAILFRACTION * Math.sin(cgAngle + PI);

  ctx.save();

  // Mirrors setupContextForZeroOffsetAndScale(...), placing the local
  // origin at the clock center. (The source's masterScale and zeroOffset
  // are NOT replicated here; see NOTES.md.)
  ctx.translate(cx, cy);

  // Mirrors CGContextScaleCTM(context, 1, -1) (EOHandTriangleView.mm:45):
  // flips the Y axis so the Y-up trig math above renders into the
  // Y-down canvas coordinate system.
  ctx.scale(1, -1);

  // CGContextSetLineWidth(context, width/10)  (EOHandTriangleView.mm:55)
  ctx.lineWidth = width / 10;

  // [strokeColor setStroke] then [fillColor setFill] (or [strokeColor
  // setFill] when fillColor is nil).  (EOHandTriangleView.mm:47-52)
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;

  ctx.beginPath();
  ctx.moveTo(leftX, leftY);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(rightX, rightY);
  ctx.lineTo(tailX, tailY);
  ctx.closePath();

  // CGContextDrawPath(context, kCGPathFillStroke) draws fill then stroke
  // in a single pass; the canvas equivalent is fill() then stroke().
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}
