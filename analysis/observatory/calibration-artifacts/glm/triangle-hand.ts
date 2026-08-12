// Standalone TypeScript port of EOHandTriangleView (a triangle clock hand)
// from the Day-4-Observatory Objective-C++ iPad app to the HTML5 Canvas.
//
// No external dependencies. Compiles under TypeScript `--strict`.
//
// Source of truth: Classes/EOHandTriangleView.mm (drawRect:) plus the
// EOHandView / EOScheduledView machinery it inherits. See calibration/NOTES.md
// for the full Core Graphics -> canvas mapping and the assumptions made.

/** Options describing one triangle clock hand draw call. */
export interface TriangleHandOptions {
    /** The canvas context to draw into; the caller owns its lifetime. */
    readonly ctx: CanvasRenderingContext2D;
    /** Hand angle in radians, same convention as EOHandTriangleView.angle. */
    readonly angle: number;
    /** Hand length in user units (pre-masterScale). Maps to source `length`. */
    readonly length: number;
    /** Hand width in user units (pre-masterScale). Maps to source `width`. */
    readonly width: number;
    /** Stroke color as a CSS color string. Mirrors source `strokeColor`. */
    readonly strokeColor: string;
    /**
     * Optional fill color as a CSS color string. When omitted (undefined) the
     * fill falls back to `strokeColor`, exactly as the source falls back to
     * `[strokeColor setFill]` when `fillColor` is nil.
     */
    readonly fillColor?: string;
    /** X coordinate of the clock center, in canvas device pixels. Default 0. */
    readonly centerX?: number;
    /** Y coordinate of the clock center, in canvas device pixels. Default 0. */
    readonly centerY?: number;
    /** EOScheduledView masterScale. The source defaults it to 1.0. Default 1. */
    readonly masterScale?: number;
}

/** Source `#define TAILFRACTION 0.21` (EOHandTriangleView.mm:16). */
const TAIL_FRACTION = 0.21;

/** Source `#define halfPi (M_PI/2)` (Constants.h:21). */
const HALF_PI = Math.PI / 2;

/** Source `#define pi M_PI` (Constants.h:19). */
const PI = Math.PI;

/**
 * Port of `-[EOHandTriangleView drawRect:]`. Renders a single triangle clock
 * hand (polygon arm + tail) into `ctx` using the same geometry and angle
 * convention as the original Core Graphics implementation.
 *
 * The function does not modify any state outside a save/restore pair, and
 * cannot be used to faithfully reproduce a layer-based rotation.
 */
export function drawTriangleHand(opts: TriangleHandOptions): void {
    const ctx: CanvasRenderingContext2D = opts.ctx;
    const angle: number = opts.angle;
    const length: number = opts.length;
    const width: number = opts.width;
    const strokeColor: string = opts.strokeColor;
    const fillColor: string | undefined = opts.fillColor;
    const centerX: number = opts.centerX ?? 0;
    const centerY: number = opts.centerY ?? 0;
    const masterScale: number = opts.masterScale ?? 1;

    // Source: `double cgAngle = angle-halfPi;` (EOHandTriangleView.mm:43).
    // The relationship between the ivar `angle` and the geometry angle used in
    // the cos/sin vertex computations is reproduced unchanged.
    const cgAngle: number = angle - HALF_PI;

    const halfW: number = width / 2;
    const tailLen: number = length * TAIL_FRACTION;

    // Five polygon vertices, computed exactly as in EOHandTriangleView.mm:56-61.
    // The two base points straddle the cgAngle axis by +/- halfPi; the tip is
    // at full length along cgAngle; the tail is at TAILFRACTION of length in
    // the opposite direction (cgAngle + pi).
    const baseX1: number = halfW * Math.cos(cgAngle - HALF_PI);
    const baseY1: number = halfW * Math.sin(cgAngle - HALF_PI);
    const tipX: number = length * Math.cos(cgAngle);
    const tipY: number = length * Math.sin(cgAngle);
    const baseX2: number = halfW * Math.cos(cgAngle + HALF_PI);
    const baseY2: number = halfW * Math.sin(cgAngle + HALF_PI);
    const tailX: number = tailLen * Math.cos(cgAngle + PI);
    const tailY: number = tailLen * Math.sin(cgAngle + PI);

    ctx.save();
    try {
        // Reproduce the net CTM the source establishes by the time the path is
        // built: translate to the clock center (the source's zeroOffset, which
        // already lands at the clock center after its frame rounding), then
        // scale uniformly by masterScale. See NOTES.md assumption A4: the
        // source's setupContextForZeroOffsetAndScale(scale, -scale) plus the
        // triangle view's own scale(1, -1) net to scale(scale, scale) inside
        // UIKit's native Y-down device space; HTML canvas is likewise Y-down,
        // so we apply translate + scale(masterScale, masterScale) and draw the
        // polygon with cos/sin directly, with no additional Y flip.
        ctx.translate(centerX, centerY);
        ctx.scale(masterScale, masterScale);

        // Fill falls back to stroke color when no fill color is supplied,
        // matching `if (fillColor) { [fillColor setFill]; } else { [strokeColor
        // setFill]; }` (EOHandTriangleView.mm:48-52).
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = fillColor ?? strokeColor;

        // Source: `CGContextSetLineWidth(context, width/10)` (line 55). Canvas
        // scales the rendered stroke width by the active CTM, so under
        // scale(masterScale) this renders at (width/10)*masterScale device px,
        // exactly as in Core Graphics.
        ctx.lineWidth = width / 10;
        // Joins/caps are not set by the source; CG defaults (miter / butt)
        // match canvas defaults. Stating them explicitly for strict parity.
        ctx.lineJoin = "miter";
        ctx.lineCap = "butt";

        ctx.beginPath();
        ctx.moveTo(baseX1, baseY1);                 // CGContextMoveToPoint
        ctx.lineTo(tipX, tipY);                     // arm -> tip
        ctx.lineTo(baseX2, baseY2);                 // arm -> far base
        ctx.lineTo(tailX, tailY);                   // -> tail
        ctx.lineTo(baseX1, baseY1);                 // close back to start
        ctx.closePath();
        // Source: CGContextDrawPath(context, kCGPathFillStroke). CG default
        // fill rule is non-zero winding; canvas ctx.fill() defaults to
        // "nonzero" too. Fill then stroke so the stroke draws on top, mirroring
        // the combined fill+stroke single-pass draw.
        ctx.fill();
        ctx.stroke();
    } finally {
        ctx.restore();
    }
}