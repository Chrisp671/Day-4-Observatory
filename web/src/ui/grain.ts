/**
 * Cyanotype print grain (DESIGN-CONSOLIDATED #8): one seeded 128×128
 * monochrome noise tile, softly blurred, composited at ~1.2% over the face.
 * Static — "print is still; only the sky moves" — and rebuilt only when the
 * canvas is refitted. The aggregate texture budget stays under the ~4%
 * measured from Anna Atkins' actual plates.
 */

const TILE = 128;

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let pattern: CanvasPattern | null = null;

/** Build (or rebuild) the seeded tile; call from the canvas fit handler. */
export function buildGrain(ctx: CanvasRenderingContext2D): void {
  const tile = document.createElement("canvas");
  tile.width = TILE;
  tile.height = TILE;
  const tctx = tile.getContext("2d");
  if (tctx === null) return;

  const rnd = mulberry32(1842); // the year Herschel published the process
  const img = tctx.createImageData(TILE, TILE);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 256);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);

  // Soft blur where supported; raw grain is an acceptable fallback.
  try {
    tctx.filter = "blur(0.75px)";
    tctx.drawImage(tile, 0, 0);
    tctx.filter = "none";
  } catch {
    /* ctx.filter unsupported — raw grain is fine at 1.2% */
  }

  pattern = ctx.createPattern(tile, "repeat");
}

/** Composite the grain across the (untranslated) canvas. */
export function drawGrain(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  if (pattern === null) return;
  ctx.save();
  ctx.globalAlpha = 0.012;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
