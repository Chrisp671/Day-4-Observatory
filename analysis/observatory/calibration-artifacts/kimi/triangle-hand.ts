const TAIL_FRACTION = 0.21;

export interface TriangleHandOptions {
	/** Hand length in user units (matches Objective-C `length`). */
	length: number;

	/** Hand width in user units (matches Objective-C `width`). */
	width: number;

	/**
	 * Rotation angle in radians (matches Objective-C `angle`).
	 * The function applies the same `cgAngle = angle - halfPi` conversion
	 * used by the original code.
	 */
	angle: number;

	/** CSS color string used for the outline. */
	strokeColor: string;

	/** CSS color string used for the interior. Defaults to `strokeColor`. */
	fillColor?: string;

	/** X coordinate of the rotation center in canvas pixels. Defaults to 0. */
	x?: number;

	/** Y coordinate of the rotation center in canvas pixels. Defaults to 0. */
	y?: number;

	/** Uniform scale factor (matches Objective-C `masterScale`). Defaults to 1. */
	scale?: number;
}

export function drawTriangleHand(
	ctx: CanvasRenderingContext2D,
	opts: TriangleHandOptions
): void {
	const {
		length,
		width,
		angle,
		strokeColor,
		fillColor = strokeColor,
		x = 0,
		y = 0,
		scale = 1,
	} = opts;

	const halfPi = Math.PI / 2;
	const pi = Math.PI;
	const cgAngle = angle - halfPi;

	ctx.save();
	ctx.translate(x, y);

	// The original sets up the context with:
	//   setupContextForZeroOffsetAndScale(context, &zeroOffset, masterScale);
	// which is equivalent to translate(...) then scale(scale, -scale), and then
	// explicitly calls CGContextScaleCTM(context, 1, -1).  The two Y flips cancel,
	// leaving a uniform scale while preserving the original semantics.
	ctx.scale(scale, -scale);
	ctx.scale(1, -1);

	ctx.strokeStyle = strokeColor;
	ctx.fillStyle = fillColor;
	ctx.lineWidth = width / 10;

	const w2 = width / 2;
	const tailLength = length * TAIL_FRACTION;

	ctx.beginPath();
	ctx.moveTo(
		w2 * Math.cos(cgAngle - halfPi),
		w2 * Math.sin(cgAngle - halfPi)
	);
	ctx.lineTo(
		length * Math.cos(cgAngle),
		length * Math.sin(cgAngle)
	);
	ctx.lineTo(
		w2 * Math.cos(cgAngle + halfPi),
		w2 * Math.sin(cgAngle + halfPi)
	);
	ctx.lineTo(
		tailLength * Math.cos(cgAngle + pi),
		tailLength * Math.sin(cgAngle + pi)
	);
	ctx.lineTo(
		w2 * Math.cos(cgAngle - halfPi),
		w2 * Math.sin(cgAngle - halfPi)
	);

	// kCGPathFillStroke: fill first, then stroke the same path.
	ctx.fill();
	ctx.stroke();

	ctx.restore();
}
