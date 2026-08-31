import sharp, { type Sharp } from 'sharp';
import * as opentype from 'opentype.js';
import { encodeH264 } from '@/lib/h264-encoder';
import { NOTO_SANS_BASE64 } from '@/lib/noto-sans-b64';

// ── Constants ────────────────────────────────────────────────────────────────

export const REEL_WIDTH = 720;
export const REEL_HEIGHT = 1280;
const REEL_FPS = 10;
const BRAND = 'Janya Creations';

// The Noto Sans font is embedded as a base64 constant so it is ALWAYS available
// regardless of the runtime filesystem (Vercel Lambda bundle, local dev, any
// container). Text is rendered as SVG <path> outlines via opentype.js — librsvg
// draws pure vector geometry with zero font lookup, so glyphs render identically
// everywhere. There is NO dependency on process.cwd()/public/fonts, __dirname
// discovery, or Next.js output file tracing.
const FONT = (() => {
  try {
    const buf = Buffer.from(NOTO_SANS_BASE64, 'base64');
    const font = opentype.parse(buf);
    // TEMP DIAGNOSTIC (metadata only — no font contents/base64 data):
    const f = font as unknown as { unitsPerEm?: number; glyphs?: { length?: number } };
    console.error(`[reel-dbg] STAGE-A font load OK embeddedBase64 bytes=${buf.length} unitsPerEm=${f.unitsPerEm} numGlyphs=${f.glyphs ? f.glyphs.length : 'n/a'}`);
    return font;
  } catch {
    // TEMP DIAGNOSTIC — font failed to build from embedded base64:
    console.error(`[reel-dbg] STAGE-A font load FAILED (FONT=null) embeddedBase64`);
    return null;
  }
})();

// ── Input Interface ──────────────────────────────────────────────────────────

export interface ReelRenderInput {
  title: string;
  priceText: string;
  discountText?: string;
  hook: string;
  cta: string;
  destinationLabel: string;
  /** 1..4 public product image URLs. Collection passes multiple. */
  images: string[];
  /** Optional category name for copy customisation. */
  categoryName?: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Strips emoji from strings used in video frames (captions may keep them). */
function stripEmoji(s: string): string {
  return s
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[✨💛😍❤️🔥💎🌟⭐💫💯👌💪🎉🎊🎁]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function categoryCopy(cat: string | undefined | null): string {
  const c = (cat || '').toLowerCase();
  if (c.includes('jewell')) return 'Effortless elegance, every day';
  if (c.includes('wear') || c.includes('clothing')) return 'Style that feels as good as it looks';
  if (c.includes('accessor')) return 'Small detail. Big difference.';
  if (c.includes('toy')) return 'Fun finds for little ones';
  return 'Made to complete your look';
}

async function loadImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

// ── SVG Builder ──────────────────────────────────────────────────────────────

interface PathCommand {
  type: string;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

/**
 * Serializes an opentype.js Path to an SVG path string using safe numeric
 * rounding. opentype's toPathData() calls roundDecimal() which string-
 * concatenates the fractional part (decimalPart + "e+" + places); for tiny
 * floating-point residues rendered in exponential notation (e.g. 1.77e-15)
 * that produces an invalid number and emits "NaN" into the SVG path data,
 * which librsvg then drops. Rounding with Math.round(n * factor) / factor
 * avoids that entirely while keeping the same 1-decimal precision.
 */
function safePathData(p: { commands: unknown[] }, decimals = 1): string {
  const factor = Math.pow(10, decimals);
  const r = (n: number) => String(Math.round(n * factor) / factor);
  let d = '';
  for (const c of p.commands as PathCommand[]) {
    if (c.type === 'M') d += `M${r(c.x!)} ${r(c.y!)}`;
    else if (c.type === 'L') d += `L${r(c.x!)} ${r(c.y!)}`;
    else if (c.type === 'Q') d += `Q${r(c.x1!)} ${r(c.y1!)} ${r(c.x!)} ${r(c.y!)}`;
    else if (c.type === 'C') d += `C${r(c.x1!)} ${r(c.y1!)} ${r(c.x2!)} ${r(c.y2!)} ${r(c.x!)} ${r(c.y!)}`;
    else if (c.type === 'Z') d += 'Z';
  }
  return d;
}

/** Converts a line of text to an SVG <path> outline (font-independent). */
function textPath(
  text: string,
  size: number,
  color: string,
  align: 'center' | 'left',
  width: number,
  padX: number,
  baselineY: number
): string {
  // TEMP DIAGNOSTIC — is the font present and is text non-empty?
  if (!FONT || !text) {
    console.error(`[reel-dbg] STAGE-A textPath EMPTY fontLoaded=${!!FONT} textLen=${(text || '').length}`);
    return '';
  }
  try {
    const p = FONT.getPath(text, 0, 0, size);
    const bb = p.getBoundingBox();
    const cx = align === 'center' ? width / 2 - (bb.x1 + bb.x2) / 2 : padX - bb.x1;
    // opentype.js Glyph.getPath() already converts the font's y-up coordinates
    // to SVG y-down (it computes y + -cmd.y * yScale), so no Y-flip is needed
    // here — only horizontal centering and baseline placement.
    const d = safePathData(p, 1);
    // TEMP DIAGNOSTIC — command count + path data length + NaN presence:
    console.error(`[reel-dbg] STAGE-A textPath OK size=${size} cmds=${p.commands.length} pathLen=${d.length} hasNaN=${d.includes('NaN')} bbox=${bb.x1.toFixed(1)},${bb.y1.toFixed(1)},${bb.x2.toFixed(1)},${bb.y2.toFixed(1)}`);
    return `<g transform="translate(${cx.toFixed(1)}, ${baselineY})"><path d="${d}" fill="${color}"/></g>`;
  } catch (e: any) {
    console.error(`[reel-dbg] STAGE-A textPath THREW msg=${e?.message || e}`);
    return '';
  }
}

function textSvg(
  width: number,
  height: number,
  lines: { text: string; size: number; color: string }[],
  opts?: { bg?: string; bgGradient?: [string, string]; align?: 'center' | 'left'; padX?: number; yBase?: number }
): Buffer {
  const padX = opts?.padX ?? 48;
  const align = opts?.align ?? 'center';
  const firstSize = lines[0]?.size ?? 0;
  const totalHeight = lines.reduce((s, l) => s + l.size * 1.15, 0);
  const yBase = opts?.yBase ?? ((height - totalHeight) / 2 + firstSize);
  let y = yBase;

  let defs = '';
  let bgElem = '';

  if (opts?.bgGradient) {
    defs = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${opts.bgGradient[0]}"/><stop offset="100%" stop-color="${opts.bgGradient[1]}"/></linearGradient></defs>`;
    bgElem = `<rect width="${width}" height="${height}" fill="url(#g)"/>`;
  } else if (opts?.bg) {
    bgElem = `<rect width="${width}" height="${height}" fill="${opts.bg}" rx="28"/>`;
  }

  const paths: string[] = [];
  for (const l of lines) {
    paths.push(textPath(l.text, l.size, l.color, align, width, padX, y));
    y += l.size * 1.2;
  }

  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${defs}<rect width="${width}" height="${height}" fill="transparent"/>${bgElem}${paths.join('')}</svg>`
  );
  // TEMP DIAGNOSTIC — SVG length + how many text <path> elements were emitted:
  const pathCount = (svg.toString().match(/<path /g) || []).length;
  console.error(`[reel-dbg] STAGE-B svg bytes=${svg.length} expectedLines=${lines.length} emittedPaths=${pathCount} emptyPaths=${lines.length - pathCount}`);
  return svg;
}

// ── Zoomed Scene Renderer ────────────────────────────────────────────────────

/**
 * Renders a scene with gentle Ken Burns zoom/pan motion.
 * `overlay` is a pre-rasterised PNG (constant across frames) so it is
 * composited (cheap) rather than re-rendered from SVG each frame.
 * stride=3 → every third output frame is rendered (held for 3 frames).
 */
async function renderZoomedScene(
  base: Buffer | null,
  baseColor: string,
  overlay: Buffer | null,
  startZoom: number,
  endZoom: number,
  panX: number,
  panY: number,
  outFrames: number
): Promise<Buffer[]> {
  const maxZoom = Math.max(startZoom, endZoom, 1.0);
  let big: Buffer | null = null;
  if (base) {
    const w = Math.round(REEL_WIDTH * maxZoom);
    const h = Math.round(REEL_HEIGHT * maxZoom);
    big = await sharp(base).resize(w, h, { fit: 'cover' }).jpeg({ quality: 75 }).toBuffer();
  }

  const stride = 3;
  const frames: Buffer[] = [];
  for (let i = 0; i < outFrames; i++) {
    const t = outFrames <= 1 ? 0 : i / (outFrames - 1);
    const zoom = startZoom + (endZoom - startZoom) * t;
    const winW = Math.round(Math.min(REEL_WIDTH * maxZoom / zoom, REEL_WIDTH * maxZoom));
    const winH = Math.round(Math.min(REEL_HEIGHT * maxZoom / zoom, REEL_HEIGHT * maxZoom));
    const maxL = (REEL_WIDTH * maxZoom - winW);
    const maxT = (REEL_HEIGHT * maxZoom - winH);
    const left = Math.round(maxL * (0.5 + panX * (t - 0.5)));
    const top = Math.round(maxT * (0.5 + panY * (t - 0.5)));

    // Render a fresh frame only every `stride` frames; otherwise reuse it.
    if (i % stride === 0) {
      let pipeline: Sharp;
      if (big) {
        pipeline = sharp(big).extract({ left: Math.max(0, Math.min(left, maxL || 0)), top: Math.max(0, Math.min(top, maxT || 0)), width: winW, height: winH });
        if (winW !== REEL_WIDTH || winH !== REEL_HEIGHT) pipeline = pipeline.resize(REEL_WIDTH, REEL_HEIGHT);
      } else {
        pipeline = sharp({ create: { width: REEL_WIDTH, height: REEL_HEIGHT, channels: 4, background: baseColor } });
      }
      if (overlay) pipeline = pipeline.composite([{ input: overlay, top: 0, left: 0 }]);
      const out = await pipeline.jpeg({ quality: 75 }).toBuffer();
      // TEMP DIAGNOSTIC — composite JPEG metadata (stage D):
      console.error(`[reel-dbg] STAGE-D composite jpeg bytes=${out.length} frame=${i}/${outFrames}`);
      frames.push(out);
    } else {
      frames.push(frames[frames.length - 1]);
    }
  }
  return frames;
}

/** Rasterises an SVG overlay once (transparent PNG) for reuse across frames. */
async function rasterizeOverlay(svg: Buffer): Promise<Buffer | null> {
  if (!svg || svg.length === 0) {
    console.error(`[reel-dbg] STAGE-C rasterizeOverlay EMPTY svg (svg len 0)`);
    return null;
  }
  try {
    const png = await sharp(svg).png().toBuffer();
    // TEMP DIAGNOSTIC — PNG dimensions + non-transparent (opaque/partially opaque) pixel count:
    let opaque = -1;
    let dims = 'n/a';
    try {
      const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
      let n = 0;
      for (let i = 0; i < data.length; i += info.channels) {
        if (data[i + 3] > 0) n++;
      }
      opaque = n;
      dims = `${info.width}x${info.height}`;
    } catch { /* ignore */ }
    console.error(`[reel-dbg] STAGE-C overlay png bytes=${png.length} dims=${dims} nonTransparentPx=${opaque}`);
    return png;
  } catch (e: any) {
    console.error(`[reel-dbg] STAGE-C rasterizeOverlay THREW msg=${e?.message || e}`);
    return null;
  }
}

// ── Main Renderer ────────────────────────────────────────────────────────────

export interface RenderedReel {
  mp4: Buffer;
  thumbnail: Buffer;
}

export async function renderReel(input: ReelRenderInput): Promise<RenderedReel> {
  const images: Buffer[] = [];
  for (const url of input.images.slice(0, 4)) {
    const buf = await loadImage(url);
    if (buf) images.push(buf);
  }

  const primary = images[0] ?? null;
  const isCollection = input.images.length > 1;
  const sHook = stripEmoji(input.hook) || 'Check this out';
  const sCta = stripEmoji(input.cta) || 'Shop Now';
  const sDest = stripEmoji(input.destinationLabel) || 'janyacreations.com';
  const sTitle = stripEmoji(input.title);
  const sPrice = stripEmoji(input.priceText);
  const sDiscount = input.discountText ? stripEmoji(input.discountText) : undefined;
  const catCopy = categoryCopy(input.categoryName);

  // ── Scene 1: PRODUCT HERO (0–1.7s, 17 frames, zoom 1.00→1.07) ──────────
  const hookSvg = textSvg(REEL_WIDTH, REEL_HEIGHT, [
    { text: sHook.slice(0, 46), size: 56, color: '#ffffff' },
  ], { bg: 'rgba(20,10,15,0.45)', yBase: 340 });
  const hookOverlay = await rasterizeOverlay(hookSvg);
  const scene1 = await renderZoomedScene(primary, '#fce7f3', hookOverlay, 1.00, 1.07, 0, -0.25, 17);

  // ── Scene 2: STYLE (1.7–3.6s, 19 frames, zoom 1.07→1.00) ───────────────
  const styleSvg = textSvg(REEL_WIDTH, REEL_HEIGHT, [
    { text: catCopy, size: 42, color: '#ffffff' },
  ], { bg: 'rgba(20,10,15,0.40)', yBase: 600 });
  const styleOverlay = await rasterizeOverlay(styleSvg);
  const scene2 = await renderZoomedScene(primary, '#ffffff', styleOverlay, 1.07, 1.00, 0, 0.15, 19);

  // ── Scene 3: PRICE / VALUE (3.6–5.5s, 19 frames, zoom 1.00→1.05) ───────
  const priceLines: { text: string; size: number; color: string; weight?: number }[] = [
    { text: sTitle.slice(0, 60), size: 32, color: '#ffffff' },
    { text: sPrice, size: 72, color: '#ffffff' },
  ];
  if (sDiscount) priceLines.push({ text: sDiscount, size: 40, color: '#fbbf24' });
  const priceSvg = textSvg(REEL_WIDTH, REEL_HEIGHT, priceLines, { bg: 'rgba(20,10,15,0.55)', yBase: 420 });
  const priceOverlay = await rasterizeOverlay(priceSvg);
  const scene3 = await renderZoomedScene(primary, '#fce7f3', priceOverlay, 1.00, 1.05, 0, 0.10, 19);

  // ── Scene 4: BRAND + CTA (5.5–7.5s, 20 frames, static brand gradient) ──
  const ctaSvg = textSvg(REEL_WIDTH, REEL_HEIGHT, [
    { text: BRAND, size: 52, color: '#ffffff' },
    { text: sCta, size: 40, color: '#fce7f3' },
    { text: sDest, size: 26, color: '#fda4af' },
  ], { bgGradient: ['#be123c', '#9f1239'], yBase: 560 });
  const ctaOverlay = await rasterizeOverlay(ctaSvg);
  const ctaBase = await sharp({
    create: { width: REEL_WIDTH, height: REEL_HEIGHT, channels: 4, background: '#9f1239' },
  }).jpeg().toBuffer();
  const ctaMerged = ctaOverlay
    ? await sharp(ctaBase).composite([{ input: ctaOverlay, top: 0, left: 0 }]).jpeg({ quality: 75 }).toBuffer()
    : ctaBase;
  const scene4: Buffer[] = [];
  for (let i = 0; i < 20; i++) scene4.push(ctaMerged);

  // ── Assemble frames ──────────────────────────────────────────────────────
  const allFrames = [...scene1, ...scene2, ...scene3, ...scene4];
  // TEMP DIAGNOSTIC — per-scene overlay presence + frame counts:
  console.error(`[reel-dbg] STAGE-D/E scene overlays: hook=${!!hookOverlay} style=${!!styleOverlay} price=${!!priceOverlay} cta=${!!ctaOverlay} frames: s1=${scene1.length} s2=${scene2.length} s3=${scene3.length} s4=${scene4.length} total=${allFrames.length}`);
  const mp4 = encodeH264(allFrames, REEL_FPS, REEL_WIDTH, REEL_HEIGHT, { preset: 'ultrafast', crf: 26 });
  const thumbnail = scene2[Math.floor(scene2.length / 2)]; // mid-style frame

  return { mp4, thumbnail };
}