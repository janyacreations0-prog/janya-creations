import sharp, { type Sharp } from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { encodeH264 } from '@/lib/h264-encoder';

// ── Constants ────────────────────────────────────────────────────────────────

export const REEL_WIDTH = 720;
export const REEL_HEIGHT = 1280;
const REEL_FPS = 10;
const BRAND = 'Janya Creations';

// On Vercel Lambda, /var/task/node_modules/next/dist/compiled/@vercel/og/noto-sans-v27-latin-regular.ttf
// is present because next is a dependency. Embed it as a data URI so librsvg
// can always find it — no reliance on stray system fonts.
const FONT_BASE64 = (() => {
  try {
    const fp = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'compiled', '@vercel', 'og', 'noto-sans-v27-latin-regular.ttf');
    return fs.readFileSync(fp).toString('base64');
  } catch {
    return '';
  }
})();
const FONT_FACE = FONT_BASE64
  ? `<style>@font-face{font-family:'N';src:url(data:font/ttf;base64,${FONT_BASE64})}</style>`
  : '';
const FONT_FAMILY = `${FONT_BASE64 ? 'N,' : ''}sans-serif`;

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

function textSvg(
  width: number,
  height: number,
  lines: { text: string; size: number; color: string; weight?: number }[],
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

  const tspans: string[] = [];
  for (const l of lines) {
    const anchor = align === 'center' ? 'middle' : 'start';
    const x = align === 'center' ? width / 2 : padX;
    tspans.push(
      `<text x="${x}" y="${Math.round(y)}" text-anchor="${anchor}" font-family="${FONT_FAMILY}" font-weight="${l.weight ?? 700}" font-size="${l.size}" fill="${l.color}">${escapeXml(l.text)}</text>`
    );
    y += l.size * 1.2;
  }

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${FONT_FACE}${defs}<rect width="${width}" height="${height}" fill="transparent"/>${bgElem}${tspans.join('')}</svg>`
  );
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
      frames.push(out);
    } else {
      frames.push(frames[frames.length - 1]);
    }
  }
  return frames;
}

/** Rasterises an SVG overlay once (transparent PNG) for reuse across frames. */
async function rasterizeOverlay(svg: Buffer): Promise<Buffer | null> {
  if (!svg || svg.length === 0) return null;
  try {
    return await sharp(svg).png().toBuffer();
  } catch {
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
    { text: sHook.slice(0, 46), size: 56, color: '#ffffff', weight: 700 },
  ], { bg: 'rgba(20,10,15,0.45)', yBase: 340 });
  const hookOverlay = await rasterizeOverlay(hookSvg);
  const scene1 = await renderZoomedScene(primary, '#fce7f3', hookOverlay, 1.00, 1.07, 0, -0.25, 17);

  // ── Scene 2: STYLE (1.7–3.6s, 19 frames, zoom 1.07→1.00) ───────────────
  const styleSvg = textSvg(REEL_WIDTH, REEL_HEIGHT, [
    { text: catCopy, size: 42, color: '#ffffff', weight: 700 },
  ], { bg: 'rgba(20,10,15,0.40)', yBase: 600 });
  const styleOverlay = await rasterizeOverlay(styleSvg);
  const scene2 = await renderZoomedScene(primary, '#ffffff', styleOverlay, 1.07, 1.00, 0, 0.15, 19);

  // ── Scene 3: PRICE / VALUE (3.6–5.5s, 19 frames, zoom 1.00→1.05) ───────
  const priceLines: { text: string; size: number; color: string; weight?: number }[] = [
    { text: sTitle.slice(0, 60), size: 32, color: '#ffffff', weight: 700 },
    { text: sPrice, size: 72, color: '#ffffff', weight: 700 },
  ];
  if (sDiscount) priceLines.push({ text: sDiscount, size: 40, color: '#fbbf24', weight: 700 });
  const priceSvg = textSvg(REEL_WIDTH, REEL_HEIGHT, priceLines, { bg: 'rgba(20,10,15,0.55)', yBase: 420 });
  const priceOverlay = await rasterizeOverlay(priceSvg);
  const scene3 = await renderZoomedScene(primary, '#fce7f3', priceOverlay, 1.00, 1.05, 0, 0.10, 19);

  // ── Scene 4: BRAND + CTA (5.5–7.5s, 20 frames, static brand gradient) ──
  const ctaSvg = textSvg(REEL_WIDTH, REEL_HEIGHT, [
    { text: BRAND, size: 52, color: '#ffffff', weight: 700 },
    { text: sCta, size: 40, color: '#fce7f3', weight: 700 },
    { text: sDest, size: 26, color: '#fda4af', weight: 700 },
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
  const mp4 = encodeH264(allFrames, REEL_FPS, REEL_WIDTH, REEL_HEIGHT, { preset: 'ultrafast', crf: 26 });
  const thumbnail = scene2[Math.floor(scene2.length / 2)]; // mid-style frame

  return { mp4, thumbnail };
}