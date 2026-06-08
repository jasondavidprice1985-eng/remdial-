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

export function saveAudio(base64: string, mimeType: string): string {
  const baseMime = mimeType.split(';')[0].trim();
  const ext = AUDIO_EXT[baseMime] || '.webm';
  const filename = `audio_${nanoid(10)}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), Buffer.from(base64, 'base64'));
  return `/uploads/${filename}`;
}
