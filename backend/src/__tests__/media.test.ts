import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const TEST_UPLOAD_DIR = '/tmp/remedial_test_uploads';

beforeAll(() => {
  process.env.UPLOAD_DIR = TEST_UPLOAD_DIR;
  fs.mkdirSync(TEST_UPLOAD_DIR, { recursive: true });
});

afterAll(() => {
  fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true });
});

describe('saveImage', () => {
  it('saves a base64 image and returns a path', async () => {
    const { saveImage } = await import('../utils/media');
    // Minimal valid JPEG: SOI marker + dummy content. saveImage validates the
    // magic bytes, so 'fake-image-bytes' is correctly rejected.
    const jpegMagic = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const payload = Buffer.concat([jpegMagic, Buffer.from('rest-of-image')]);
    const base64 = payload.toString('base64');
    const result = saveImage(base64);

    expect(result).toMatch(/^\/uploads\/img_[\w-]+\.jpg$/);
    const filePath = path.join(TEST_UPLOAD_DIR, path.basename(result));
    expect(fs.existsSync(filePath)).toBe(true);
    const saved = fs.readFileSync(filePath);
    expect(saved.equals(payload)).toBe(true);
  });

  it('rejects non-JPEG/PNG/WebP bytes', async () => {
    const { saveImage } = await import('../utils/media');
    const garbage = Buffer.from('not-an-image').toString('base64');
    expect(() => saveImage(garbage)).toThrow(/JPEG|PNG|WebP/);
  });
});

// Minimal valid container headers — what saveAudio checks for
const WEBM_MAGIC = Buffer.from([0x1A, 0x45, 0xDF, 0xA3, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
const OGG_MAGIC  = Buffer.concat([Buffer.from('OggS'),  Buffer.alloc(8)]);
const MP3_MAGIC  = Buffer.concat([Buffer.from('ID3'),   Buffer.alloc(9)]);
const MP4_MAGIC  = Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp'), Buffer.alloc(4)]);

function withMagic(magic: Buffer): string {
  return Buffer.concat([magic, Buffer.from('rest')]).toString('base64');
}

describe('saveAudio', () => {
  it('saves a valid webm audio and returns a path', async () => {
    const { saveAudio } = await import('../utils/media');
    const result = saveAudio(withMagic(WEBM_MAGIC), 'audio/webm');

    expect(result).toMatch(/^\/uploads\/audio_[\w-]+\.webm$/);
    const filePath = path.join(TEST_UPLOAD_DIR, path.basename(result));
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('maps mime types to correct extensions', async () => {
    const { saveAudio } = await import('../utils/media');

    const tests: [string, RegExp, Buffer][] = [
      ['audio/mpeg',    /\.mp3$/,  MP3_MAGIC],
      ['audio/mp4',     /\.mp4$/,  MP4_MAGIC],
      ['audio/ogg',     /\.ogg$/,  OGG_MAGIC],
      ['audio/aac',     /\.aac$/,  MP4_MAGIC],
      ['audio/webm',    /\.webm$/, WEBM_MAGIC],
      ['audio/unknown', /\.webm$/, WEBM_MAGIC],
    ];

    for (const [mime, pattern, magic] of tests) {
      const result = saveAudio(withMagic(magic), mime);
      expect(result).toMatch(pattern);
    }
  });

  it('strips codec info from mime type', async () => {
    const { saveAudio } = await import('../utils/media');
    const result = saveAudio(withMagic(WEBM_MAGIC), 'audio/webm;codecs=opus');
    expect(result).toMatch(/\.webm$/);
  });

  it('rejects bytes that are not a known audio container', async () => {
    const { saveAudio } = await import('../utils/media');
    const garbage = Buffer.from('definitely-not-audio').toString('base64');
    expect(() => saveAudio(garbage, 'audio/webm')).toThrow(/audio format/i);
  });
});
