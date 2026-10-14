export const TAILFRACTION = 0.21;

const HALF_PI = Math.PI / 2;
const PI = Math.PI;

export interface TriangleHandOptions {
	x: number;
	y: number;
	length: number;
	width: number;
	angle: number;
	strokeColor: string;
	fillColor?: string;
}

export function drawTriangleHand(
	ctx: CanvasRenderingContext2D,
	opts: TriangleHandOptions,
): void {
	const { x, y, length, width, angle, strokeColor } = opts;
	const fillColor = opts.fillColor ?? strokeColor;

	const cgAngle = angle - HALF_PI;

	ctx.save();
	ctx.translate(x, y);
	ctx.scale(1, -1);

	ctx.lineWidth = width / 10;
	ctx.strokeStyle = strokeColor;
	ctx.fillStyle = fillColor;

	ctx.beginPath();
	ctx.moveTo(
		(width / 2) * Math.cos(cgAngle - HALF_PI),
		(width / 2) * Math.sin(cgAngle - HALF_PI),
	);
	ctx.lineTo(length * Math.cos(cgAngle), length * Math.sin(cgAngle));
	ctx.lineTo(
		(width / 2) * Math.cos(cgAngle + HALF_PI),
		(width / 2) * Math.sin(cgAngle + HALF_PI),
	);
	ctx.lineTo(
		length * TAILFRACTION * Math.cos(cgAngle + PI),
		length * TAILFRACTION * Math.sin(cgAngle + PI),
	);
	ctx.closePath();

	ctx.fill();
	ctx.stroke();

	ctx.restore();
}
