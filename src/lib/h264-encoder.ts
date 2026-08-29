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
const FFMPEG_PATH = require('ffmpeg-static');

export function encodeH264(
  frames: Buffer[],
  fps: number,
  width: number,
  height: number
): Buffer {
  if (!frames || frames.length === 0) {
    throw new Error('No frames to encode');
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
    // Clean up the temp file if it exists.
    try { fs.unlinkSync(outFile); } catch { /* ignore */ }
    const stderr = result.stderr?.toString() ?? '';
    throw new Error(`H.264 encoding failed (exit ${result.status}): ${stderr.slice(-200)}`);
  }

  if (!fs.existsSync(outFile)) {
    throw new Error('H.264 encoding produced no output file');
  }

  const mp4 = fs.readFileSync(outFile);
  try { fs.unlinkSync(outFile); } catch { /* ignore */ }

  if (mp4.length === 0) {
    throw new Error('H.264 encoding produced an empty output');
  }

  return mp4;
}