import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { UPLOAD_DIR } from '../db';

export function saveImage(base64: string): string {
  // Validate it looks like a real image by checking the first bytes
  const buf = Buffer.from(base64, 'base64');
  const header = buf.slice(0, 4);
  const isJpeg = header[0] === 0xFF && header[1] === 0xD8;
  const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
  const isWebp = buf.length > 12 && buf.slice(8, 12).toString() === 'WEBP';
  if (!isJpeg && !isPng && !isWebp) {
    throw new Error('Invalid image format — only JPEG, PNG, and WebP are accepted');
  }

  const ext = isPng ? '.png' : isWebp ? '.webp' : '.jpg';
  const filename = `img_${nanoid(10)}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buf);
  return `/uploads/${filename}`;
}

const AUDIO_EXT: Record<string, string> = {
  'audio/webm':  '.webm',
  'audio/mp4':   '.mp4',
  'audio/ogg':   '.ogg',
  'audio/mpeg':  '.mp3',
  'audio/aac':   '.aac',
};

// Validate audio bytes by container magic — matches the formats we accept above.
function looksLikeAudio(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // WebM/Matroska — starts with 0x1A 0x45 0xDF 0xA3 (EBML)
  if (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) return true;
  // Ogg — 'OggS'
  if (buf.slice(0, 4).toString() === 'OggS') return true;
  // MP3 — ID3 tag or MPEG frame sync (0xFF 0xFB/0xF3/0xF2)
  if (buf.slice(0, 3).toString() === 'ID3') return true;
  if (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) return true;
  // MP4 / M4A / AAC-in-MP4 — 'ftyp' at byte 4
  if (buf.slice(4, 8).toString() === 'ftyp') return true;
  // ADTS AAC — 0xFF 0xF1 / 0xFF 0xF9 (sync word)
  if (buf[0] === 0xFF && (buf[1] === 0xF1 || buf[1] === 0xF9)) return true;
  return false;
}

export function saveAudio(base64: string, mimeType: string): string {
  const buf = Buffer.from(base64, 'base64');
  if (!looksLikeAudio(buf)) {
    throw new Error('Invalid audio format — only WebM, Ogg, MP3, MP4/AAC are accepted');
  }
  const baseMime = mimeType.split(';')[0].trim();
  const ext = AUDIO_EXT[baseMime] || '.webm';
  const filename = `audio_${nanoid(10)}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buf);
  return `/uploads/${filename}`;
}
