export type TriangleHandColor = string | CanvasGradient | CanvasPattern;

export interface TriangleHandOptions {
  /** Canvas-space x coordinate of the hand's pivot. */
  x: number;
  /** Canvas-space y coordinate of the hand's pivot. */
  y: number;
  length: number;
  width: number;
  /** Source EOHandView angle in radians; zero points toward the top. */
  angle: number;
  strokeColor: TriangleHandColor;
  /** Defaults to strokeColor, matching a nil UIColor fillColor. */
  fillColor?: TriangleHandColor | null;
}

const HALF_PI = Math.PI / 2;
const TAIL_FRACTION = 0.21;

export function drawTriangleHand(
  ctx: CanvasRenderingContext2D,
  opts: TriangleHandOptions,
): void {
  const { x, y, length, width, angle, strokeColor } = opts;
  const cgAngle = angle - HALF_PI;
  const halfWidth = width / 2;
  const firstX = halfWidth * Math.cos(cgAngle - HALF_PI);
  const firstY = halfWidth * Math.sin(cgAngle - HALF_PI);

  ctx.save();
  ctx.translate(x, y);

  // setupContextForZeroOffsetAndScale establishes y-up coordinates. The
  // triangle's explicit flip restores canvas-style y-down coordinates.
  ctx.scale(1, -1);
  ctx.scale(1, -1);

  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = opts.fillColor ?? strokeColor;
  ctx.lineWidth = width / 10;

  ctx.beginPath();
  ctx.moveTo(firstX, firstY);
  ctx.lineTo(length * Math.cos(cgAngle), length * Math.sin(cgAngle));
  ctx.lineTo(
    halfWidth * Math.cos(cgAngle + HALF_PI),
    halfWidth * Math.sin(cgAngle + HALF_PI),
  );
  ctx.lineTo(
    length * TAIL_FRACTION * Math.cos(cgAngle + Math.PI),
    length * TAIL_FRACTION * Math.sin(cgAngle + Math.PI),
  );
  ctx.lineTo(firstX, firstY);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}
