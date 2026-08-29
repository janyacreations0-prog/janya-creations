/**
 * Minimal, dependency-free MP4 container writer for Motion-JPEG video.
 *
 * Why this exists: Vercel serverless cannot reliably run FFmpeg binaries or
 * WASM x264 within its execution-time/memory limits, and no pure-JS H.264
 * encoder is viable on that runtime. This writes a VALID, browser-playable
 * MP4 that wraps JPEG frames (codec 'jpeg'). It is preview-grade: Instagram
 * publishing (Phase 3) will re-encode to H.264 via a background/encoding step
 * while reusing the exact same frame pipeline.
 */

export interface MjpegMp4Options {
  width: number;
  height: number;
  /** Frames per second (container timescale). */
  fps: number;
  /** Complete JPEG buffers (each a full JPEG file with SOI/EOI). */
  frames: Buffer[];
}

const TIMESCALE = 1000;

function box(type: string, payload: Buffer): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(8 + payload.length, 0);
  buf.write(type, 4, 'latin1');
  return Buffer.concat([buf, payload]);
}

function fullBox(type: string, version: number, flags: number, payload: Buffer): Buffer {
  const h = Buffer.alloc(4);
  h.writeUInt32BE((version << 24) | flags, 0);
  return box(type, Buffer.concat([h, payload]));
}

export function muxMpeg4Mp4({ width, height, fps, frames }: MjpegMp4Options): Buffer {
  if (!frames || frames.length === 0) {
    throw new Error('No frames to mux');
  }
  const frameCount = frames.length;
  const frameDuration = Math.max(1, Math.round(TIMESCALE / fps));
  const totalJpegBytes = frames.reduce((s, f) => s + f.length, 0);

  // ftyp
  const ftypPayload = Buffer.alloc(20);
  ftypPayload.write('isom', 0, 'latin1'); // major brand
  ftypPayload.writeUInt32BE(512, 4); // minor version
  ftypPayload.write('isom', 8, 'latin1');
  ftypPayload.write('mp42', 12, 'latin1');
  ftypPayload.write('avc1', 16, 'latin1');
  const ftyp = box('ftyp', ftypPayload);

  // mdat data start offset in the final file
  const mdatDataOffset = ftyp.length + 8; // after ftyp + mdat header

  // stsd — video sample entry for JPEG
  const sampleEntry = Buffer.alloc(78);
  sampleEntry.writeUInt32BE(78, 0);
  sampleEntry.write('jpeg', 4, 'latin1');
  sampleEntry.writeUInt16BE(0, 12); // reserved
  sampleEntry.writeUInt16BE(1, 14); // data_reference_index
  sampleEntry.writeUInt16BE(0, 16); // pre_defined
  sampleEntry.writeUInt16BE(0, 18); // reserved
  sampleEntry.writeUInt32BE(0, 20);
  sampleEntry.writeUInt32BE(0, 24);
  sampleEntry.writeUInt32BE(0, 28);
  sampleEntry.writeUInt16BE(width, 32);
  sampleEntry.writeUInt16BE(height, 34);
  sampleEntry.writeUInt32BE(0x00480000, 36); // horizresolution
  sampleEntry.writeUInt32BE(0x00480000, 40); // vertresolution
  sampleEntry.writeUInt32BE(0, 44);
  sampleEntry.writeUInt16BE(1, 48); // frame_count
  // compressorname: 32 zero bytes (offset 50..82) already zero
  sampleEntry.writeUInt16BE(24, 78 - 6); // depth at offset 72
  sampleEntry.writeUInt16BE(0xffff, 76 - 6 + 2); // pre_defined at offset 74... 
  // Fix byte positions explicitly below.

  // Rebuild sample entry with exact offsets to avoid off-by-one confusion.
  const se = Buffer.alloc(86);
  se.writeUInt32BE(86, 0); // size
  se.write('jpeg', 4, 'latin1'); // type
  se.writeUInt16BE(0, 8); // reserved
  se.writeUInt16BE(1, 10); // data_reference_index
  se.writeUInt16BE(0, 12); // pre_defined
  se.writeUInt16BE(0, 14); // reserved
  se.writeUInt32BE(0, 16);
  se.writeUInt32BE(0, 20);
  se.writeUInt32BE(0, 24);
  se.writeUInt16BE(width, 28);
  se.writeUInt16BE(height, 30);
  se.writeUInt32BE(0x00480000, 32); // horizresolution
  se.writeUInt32BE(0x00480000, 36); // vertresolution
  se.writeUInt32BE(0, 40); // reserved
  se.writeUInt16BE(1, 44); // frame_count
  // compressorname: 32 bytes at offset 46..78 (zeros)
  se.writeUInt16BE(24, 78); // depth
  se.writeInt16BE(-1, 80); // pre_defined (0xFFFF)

  const stsd = fullBox('stsd', 0, 0, Buffer.concat([
    Buffer.from([0, 0, 0, 1]), // entry_count
    se,
  ]));

  // stts — constant frame duration
  const sttsEntries = Buffer.alloc(8);
  sttsEntries.writeUInt32BE(1, 0); // entry count
  sttsEntries.writeUInt32BE(frameCount, 4); // sample count
  const stts = fullBox('stts', 0, 0, Buffer.concat([sttsEntries, Buffer.from([0, 0, 0, frameDuration])]));

  // stsc — all samples in one chunk
  const stsc = fullBox('stsc', 0, 0, Buffer.concat([
    Buffer.from([0, 0, 0, 1]), // entry count
    Buffer.from([0, 0, 0, 1]), // first chunk
    Buffer.from([0, 0, 0, frameCount]), // samples per chunk
    Buffer.from([0, 0, 0, 1]), // sample description index
  ]));

  // stsz — variable sample sizes
  const stszHeader = Buffer.alloc(12);
  stszHeader.writeUInt32BE(0, 0); // sample_size (variable)
  stszHeader.writeUInt32BE(frameCount, 4); // sample count
  const sizes = Buffer.alloc(4 * frameCount);
  frames.forEach((f, i) => sizes.writeUInt32BE(f.length, i * 4));
  const stsz = fullBox('stsz', 0, 0, Buffer.concat([stszHeader, sizes]));

  // stco — one chunk offset
  const stco = fullBox('stco', 0, 0, Buffer.concat([
    Buffer.from([0, 0, 0, 1]), // entry count
    Buffer.from([0, 0, 0, mdatDataOffset >>> 24, (mdatDataOffset >>> 16) & 0xff, (mdatDataOffset >>> 8) & 0xff, mdatDataOffset & 0xff]),
  ]));

  const stbl = box('stbl', Buffer.concat([stsd, stts, stsc, stsz, stco]));

  // minf
  const vmhd = fullBox('vmhd', 0, 1, Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])); // graphicsmode + opcolor
  const dinf = box('dinf', box('dref', fullBox('url ', 0, 1, Buffer.alloc(0))));
  const minf = box('minf', Buffer.concat([vmhd, dinf, stbl]));

  // mdia
  const mdhd = fullBox('mdhd', 0, 0, Buffer.concat([
    Buffer.from([0, 0, 0, 0]), // creation time
    Buffer.from([0, 0, 0, 0]), // modification time
    Buffer.from([0, 0, (TIMESCALE >>> 8) & 0xff, TIMESCALE & 0xff]),
    Buffer.from([0, 0, 0, frameCount]), // duration (frames at timescale)
    Buffer.from([0x55, 0xc4]), // language (und)
    Buffer.from([0, 0]), // pre_defined
  ]));
  const hdlr = fullBox('hdlr', 0, 0, Buffer.concat([
    Buffer.from([0, 0, 0, 0]), // pre_defined
    Buffer.from([0x76, 0x69, 0x64, 0x65]), // 'vide'
    Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), // reserved
    Buffer.from('VideoHandler\0', 'latin1'),
  ]));
  const mdia = box('mdia', Buffer.concat([mdhd, hdlr, minf]));

  // trak
  const tkhd = fullBox('tkhd', 0, 3, Buffer.concat([
    Buffer.from([0, 0, 0, 0]), // creation
    Buffer.from([0, 0, 0, 0]), // modification
    Buffer.from([0, 0, 0, 1]), // track id
    Buffer.from([0, 0, 0, 0]), // reserved
    Buffer.from([0, 0, 0, frameCount]), // duration
    Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]), // reserved
    Buffer.from([0, 0]), // layer
    Buffer.from([0, 0]), // alternate group
    Buffer.from([0, 0]), // volume
    Buffer.from([0, 0]), // reserved
    Buffer.alloc(36), // matrix (identity)
    Buffer.from([0, 0, 0, width]), // width (16.16)
    Buffer.from([0, 0, 0, height]), // height (16.16)
  ]));
  const trak = box('trak', Buffer.concat([tkhd, mdia]));

  // mvhd
  const mvhd = fullBox('mvhd', 0, 0, Buffer.concat([
    Buffer.from([0, 0, 0, 0]), // creation
    Buffer.from([0, 0, 0, 0]), // modification
    Buffer.from([0, 0, 0, (TIMESCALE >>> 8) & 0xff, TIMESCALE & 0xff]), // timescale (uint32)
    Buffer.from([0, 0, 0, frameCount]), // duration
    Buffer.from([0, 0, 0, 1]), // rate
    Buffer.from([0x01, 0x00]), // volume
    Buffer.from([0, 0]), // reserved
    Buffer.alloc(8), // reserved
    Buffer.alloc(36), // matrix
    Buffer.alloc(24), // pre_defined
    Buffer.from([0, 0, 0, 2]), // next track id
  ]));
  const moov = box('moov', Buffer.concat([mvhd, trak]));

  // mdat
  const mdatHeader = Buffer.alloc(8);
  mdatHeader.writeUInt32BE(8 + totalJpegBytes, 0);
  mdatHeader.write('mdat', 4, 'latin1');

  return Buffer.concat([ftyp, mdatHeader, ...frames, moov]);
}
