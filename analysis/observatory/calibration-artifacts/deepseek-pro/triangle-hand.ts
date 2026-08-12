const TAILFRACTION = 0.21;

export interface TriangleHandOptions {
	angle: number;
	length: number;
	width: number;
	strokeColor: string;
	fillColor?: string;
}

export function drawTriangleHand(
	ctx: CanvasRenderingContext2D,
	opts: TriangleHandOptions,
): void {
	const { angle, length, width, strokeColor, fillColor } = opts;

	ctx.save();

	ctx.scale(1, -1);

	const cgAngle = Math.PI / 2 - angle;

	const halfW = width / 2;
	const tailLength = length * TAILFRACTION;
	const lineWidth = width / 10;

	const cosA = Math.cos(cgAngle);
	const sinA = Math.sin(cgAngle);

	const baseLeftX = halfW * Math.cos(cgAngle - Math.PI / 2);
	const baseLeftY = halfW * Math.sin(cgAngle - Math.PI / 2);
	const tipX = length * cosA;
	const tipY = length * sinA;
	const baseRightX = halfW * Math.cos(cgAngle + Math.PI / 2);
	const baseRightY = halfW * Math.sin(cgAngle + Math.PI / 2);
	const tailX = tailLength * Math.cos(cgAngle + Math.PI);
	const tailY = tailLength * Math.sin(cgAngle + Math.PI);

	ctx.beginPath();
	ctx.moveTo(baseLeftX, baseLeftY);
	ctx.lineTo(tipX, tipY);
	ctx.lineTo(baseRightX, baseRightY);
	ctx.lineTo(tailX, tailY);
	ctx.closePath();

	ctx.lineWidth = lineWidth;
	ctx.strokeStyle = strokeColor;
	ctx.fillStyle = fillColor !== undefined ? fillColor : strokeColor;

	ctx.fill();
	ctx.stroke();

	ctx.restore();
}
