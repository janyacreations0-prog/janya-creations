import sharp from 'sharp';
import { muxMpeg4Mp4 } from '@/lib/mjpeg-mp4';

/**
 * Reel frame generator.
 *
 * Renders 4 scenes (hook / product / price / cta) at 9:16 as JPEG buffers via
 * sharp (already installed), then muxes them into a playable MP4 using the
 * dependency-free MJPEG container writer. Runs entirely on Vercel within
 * function limits — no FFmpeg binary, no WASM x264, no paid service.
 *
 * Frames are ~720x1280 (9:16). Instagram publishing (Phase 3) will re-encode
 * to H.264 while reusing this exact frame pipeline.
 */

export const REEL_WIDTH = 720;
export const REEL_HEIGHT = 1280;
const REEL_FPS = 10;
const SCENE_SECONDS = 1.5;
const FRAMES_PER_SCENE = Math.round(SCENE_SECONDS * REEL_FPS); // 15
const BRAND = 'Janya Creations';

export interface ReelRenderInput {
  title: string;
  priceText: string;
  discountText?: string;
  hook: string;
  cta: string;
  destinationLabel: string;
  /** 1..4 public product image URLs. Collection passes multiple. */
  images: string[];
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

function textSvg(width: number, height: number, lines: { text: string; size: number; color: string; weight?: number; maxLines?: number }[], opts?: { bg?: string; padX?: number; align?: 'center' | 'left' }): Buffer {
  const padX = opts?.padX ?? 48;
  const align = opts?.align ?? 'center';
  const firstSize = lines[0]?.size ?? 0;
  const totalHeight = lines.reduce((s, l) => s + l.size * 1.15, 0);
  let y = (height - totalHeight) / 2 + firstSize;
  const tspans: string[] = [];
  for (const l of lines) {
    const anchor = align === 'center' ? 'middle' : 'start';
    const x = align === 'center' ? width / 2 : padX;
    tspans.push(
      `<text x="${x}" y="${Math.round(y)}" text-anchor="${anchor}" font-family="sans-serif, Arial, Helvetica" font-weight="${l.weight ?? 700}" font-size="${l.size}" fill="${l.color}">${escapeXml(l.text)}</text>`
    );
    y += l.size * 1.2;
  }
  const bg = opts?.bg ? `<rect width="${width}" height="${height}" fill="${opts.bg}" rx="28"/>` : '';
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="transparent"/>${bg}${tspans.join('')}</svg>`
  );
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function coverWithText(base: Buffer | null, baseColor: string, overlaySvg: Buffer, blur: boolean): Promise<Buffer> {
  let pipeline = sharp({
    create: { width: REEL_WIDTH, height: REEL_HEIGHT, channels: 4, background: baseColor },
  });
  if (base) {
    const img = sharp(base).resize(REEL_WIDTH, REEL_HEIGHT, { fit: 'cover' });
    if (blur) img.blur(18);
    pipeline = sharp(await img.toBuffer());
  }
  if (overlaySvg && overlaySvg.length > 0) {
    pipeline = pipeline.composite([{ input: overlaySvg, top: 0, left: 0 }]);
  }
  return pipeline
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

async function productGrid(images: Buffer[]): Promise<Buffer> {
  const upTo = Math.min(images.length, 4);
  if (upTo === 0) {
    return sharp({
      create: { width: REEL_WIDTH, height: REEL_HEIGHT, channels: 4, background: '#fce7f3' },
    })
      .jpeg({ quality: 82 })
      .toBuffer();
  }
  if (upTo === 1) {
    return sharp(images[0]).resize(REEL_WIDTH, REEL_HEIGHT, { fit: 'cover' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  }
  const cellW = REEL_WIDTH / 2;
  const cellH = REEL_HEIGHT / 2;
  const cells = await Promise.all(
    images.slice(0, upTo).map((b) => sharp(b).resize(cellW, cellH, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer())
  );
  const pos: [number, number][] = [
    [0, 0],
    [cellW, 0],
    [0, cellH],
    [cellW, cellH],
  ];
  return sharp({
    create: { width: REEL_WIDTH, height: REEL_HEIGHT, channels: 4, background: '#ffffff' },
  })
    .composite(cells.map((c, i) => ({ input: c, top: pos[i][1], left: pos[i][0] })))
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

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

  const isCollection = input.images.length > 1;

  // ── Scene 1: hook ──
  const hookSvg = textSvg(REEL_WIDTH, REEL_HEIGHT, [
    { text: input.hook.slice(0, 46), size: 68, color: '#ffffff' },
  ], { bg: 'rgba(20,10,15,0.55)', padX: 56 });
  const hookFrame = await coverWithText(images[0] ?? null, '#fce7f3', hookSvg, true);

  // ── Scene 2: product ──
  let productFrame: Buffer;
  if (isCollection && images.length > 1) {
    productFrame = await productGrid(images);
  } else {
    productFrame = await coverWithText(images[0] ?? null, '#ffffff', Buffer.alloc(0), false);
  }
  const titleSvg = textSvg(REEL_WIDTH, 300, [
    { text: input.title.slice(0, 64), size: 40, color: '#ffffff', maxLines: 2 },
  ], { bg: 'rgba(0,0,0,0.45)', align: 'left' });
  productFrame = await sharp(productFrame)
    .composite([{ input: titleSvg, top: REEL_HEIGHT - 300, left: 0 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  // ── Scene 3: price ──
  const priceLines = [{ text: input.priceText, size: 96, color: '#ffffff' }];
  if (input.discountText) priceLines.push({ text: input.discountText, size: 44, color: '#fbbf24' });
  const priceSvg = textSvg(REEL_WIDTH, REEL_HEIGHT, priceLines, { bg: 'rgba(20,10,15,0.55)' });
  const priceFrame = await coverWithText(images[0] ?? null, '#fce7f3', priceSvg, true);

  // ── Scene 4: cta ──
  const ctaSvg = textSvg(REEL_WIDTH, REEL_HEIGHT, [
    { text: BRAND, size: 58, color: '#ffffff' },
    { text: input.cta, size: 46, color: '#fce7f3' },
    { text: input.destinationLabel, size: 30, color: '#fda4af' },
  ], { bg: 'linear-gradient(180deg,#be123c 0%,#9f1239 100%)' });
  const ctaFrame = await coverWithText(null, '#9f1239', ctaSvg, false);

  const scenes = [hookFrame, productFrame, priceFrame, ctaFrame];
  const frames: Buffer[] = [];
  for (const scene of scenes) {
    for (let i = 0; i < FRAMES_PER_SCENE; i++) frames.push(scene);
  }

  const mp4 = muxMpeg4Mp4({ width: REEL_WIDTH, height: REEL_HEIGHT, fps: REEL_FPS, frames });
  const thumbnail = scenes[1]; // product scene as poster

  return { mp4, thumbnail };
}
