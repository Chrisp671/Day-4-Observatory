/**
 * Standalone triangle-clock-hand renderer for HTML Canvas.
 *
 * Faithfully reproduces the geometry from EOHandTriangleView.mm:
 *   - isosceles-triangle arm with a short tail (TAILFRACTION = 0.21)
 *   - fill falls back to stroke colour when no fill colour is given
 *   - line width = width / 10
 *   - angle convention: the caller passes the *original* `angle`
 *     (maths convention: 0 = +x axis, counter-clockwise, y-up).
 *     Internally the function negates it so that the canvas (y-down,
 *     clockwise) draws the same visual as the source after its
 *     CGContextScaleCTM(ctx, 1, -1) flip.
 */

/** Options accepted by {@link drawTriangleHand}. */
export interface TriangleHandOptions {
	/** Distance from the pivot to the tip of the triangle. */
	length: number;
	/** Full width of the triangle base (perpendicular to the arm). */
	width: number;
	/**
	 * Angle in radians.
	 *
	 * Uses the **same convention as the Objective-C source**:
	 * - 0 radians points along the positive-x axis (3-o'clock).
	 * - Positive values rotate **counter-clockwise** in a y-up system.
	 *
	 * The function internally flips for the canvas y-down axis so
	 * callers can pass the same value the Obj-C `angle` field holds.
	 */
	angle: number;
	/** Colour used for the stroke (outline). */
	strokeColor: string;
	/**
	 * Colour used to fill the interior.
	 * When omitted, falls back to {@link strokeColor}.
	 */
	fillColor?: string;
}

/** Fraction of `length` used for the backward-pointing tail. */
const TAIL_FRACTION = 0.21;

/**
 * Draw a triangle clock-hand onto a 2-D canvas context.
 *
 * The pivot (rotation centre) is at the current canvas origin —
 * call `ctx.translate(x, y)` before this function to position it.
 */
export function drawTriangleHand(
	ctx: CanvasRenderingContext2D,
	opts: TriangleHandOptions,
): void {
	const { length, width, angle, strokeColor, fillColor } = opts;

	/*
	 * Coordinate mapping
	 * -----------------
	 * The Obj-C code applies  CGContextScaleCTM(ctx, 1, -1)  which flips the
	 * y-axis so that positive angles go counter-clockwise (maths convention).
	 * The canvas y-axis already points down, so we achieve the same visual by
	 * **negating** the angle:
	 *
	 *   cgAngle  = angle - Math.PI / 2        (Obj-C: offset for CG)
	 *   canvas   = -angle                      (negate for y-down)
	 *
	 * Each vertex formula below is the simplification of applying the Obj-C
	 * trig with the y-flip baked in.  See calibration/NOTES.md for the full
	 * derivation.
	 */
	const a = -angle;
	const halfW = width / 2;
	const tailLen = length * TAIL_FRACTION;
	const lw = width / 10;

	ctx.save();
	ctx.lineWidth = lw;
	ctx.strokeStyle = strokeColor;
	ctx.fillStyle = fillColor ?? strokeColor;

	ctx.beginPath();

	// Left base point (pivot + halfW perpendicular to arm, CW side)
	ctx.moveTo(halfW * Math.sin(a), halfW * Math.cos(a));

	// Tip
	ctx.lineTo(length * Math.cos(a), -length * Math.sin(a));

	// Right base point (pivot + halfW perpendicular to arm, CCW side)
	ctx.lineTo(-halfW * Math.sin(a), -halfW * Math.cos(a));

	// Tail (short extension behind the pivot)
	ctx.lineTo(-tailLen * Math.cos(a), tailLen * Math.sin(a));

	// Close back to left base
	ctx.lineTo(halfW * Math.sin(a), halfW * Math.cos(a));

	ctx.closePath();
	ctx.fill();
	ctx.stroke();

	ctx.restore();
}
