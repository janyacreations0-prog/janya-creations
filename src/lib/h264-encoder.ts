import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Encodes a sequence of JPEG frames into a browser-playable H.264 MP4 file.
 *
 * Uses ffmpeg-static (the native binary, included in the deployment bundle) to
 * produce a genuine H.264/AVC video track. The output is written to a temporary
 * file (seekable — required by the MP4 muxer) and read back as a Buffer.
 *
 * Vercel /tmp is ephemeral (512 MB) and perfectly suited for this workflow.
 * The file is cleaned up immediately after reading.
 */
const FFMPEG_PATH: string = require('ffmpeg-static');

export function encodeH264(
  frames: Buffer[],
  fps: number,
  width: number,
  height: number
): Buffer {
  if (!frames || frames.length === 0) {
    throw new Error('No frames to encode');
  }

  const start = Date.now();

  // Defensive fix for the common ffmpeg-static-on-Vercel failure: the Lambda
  // packaging can strip the executable bit, causing spawn EACCES. Only chmod if
  // the binary is not already executable (idempotent, no-op when already set).
  try {
    fs.accessSync(FFMPEG_PATH, fs.constants.X_OK);
  } catch {
    try {
      fs.chmodSync(FFMPEG_PATH, 0o755);
    } catch (chmodErr: any) {
      console.error('[reel] h264 chmod failed:', chmodErr?.code || chmodErr?.message || chmodErr);
    }
  }

  const input = Buffer.concat(frames);
  const outFile = path.join(os.tmpdir(), `reel_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);

  const args = [
    '-y',
    '-f', 'image2pipe',
    '-framerate', String(fps),
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-f', 'mp4',
    outFile,
  ];

  const result = spawnSync(FFMPEG_PATH, args, {
    input,
    encoding: null,
    maxBuffer: 200 * 1024 * 1024,
    timeout: 60_000,
  });

  if (result.status !== 0) {
    // Diagnostic-only logging (server-side): NEVER log keys, tokens, cookies or
    // signed URLs. Only process metadata + ffmpeg output.
    const stderr = (result.stderr?.toString() ?? '').slice(-400);
    const stdoutTail = (result.stdout?.toString() ?? '').slice(-100);
    const spawnError = result.error
      ? `code=${(result.error as NodeJS.ErrnoException).code} message=${(result.error as NodeJS.ErrnoException).message}`
      : 'none';
    console.error(
      `[reel] H264 ffmpeg result: status=${result.status} signal=${result.signal} error=${spawnError} ` +
      `frames=${frames.length} fps=${fps} ${width}x${height} elapsed=${Date.now() - start}ms ` +
      `stderr="${stderr.trim()}" stdout="${stdoutTail.trim()}"`
    );
    try { fs.unlinkSync(outFile); } catch { /* ignore */ }
    throw new Error('H.264 encoding failed. Please try again.');
  }

  if (!fs.existsSync(outFile)) {
    throw new Error('H.264 encoding produced no output file');
  }

  const mp4 = fs.readFileSync(outFile);
  try { fs.unlinkSync(outFile); } catch { /* ignore */ }

  if (mp4.length === 0) {
    throw new Error('H.264 encoding produced an empty output');
  }

  console.error(
    `[reel] H264 encode ok: ${mp4.length} bytes, ${frames.length} frames, ${width}x${height}, ${Date.now() - start}ms`
  );

  return mp4;
}
