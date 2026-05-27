import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { UPLOAD_DIR } from '../db';

export function saveImage(base64: string): string {
  const filename = `img_${nanoid(10)}.jpg`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), Buffer.from(base64, 'base64'));
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
