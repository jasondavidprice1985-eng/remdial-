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

describe('saveAudio', () => {
  it('saves audio with correct extension from mime type', async () => {
    const { saveAudio } = await import('../utils/media');
    const base64 = Buffer.from('fake-audio-bytes').toString('base64');
    const result = saveAudio(base64, 'audio/webm');

    expect(result).toMatch(/^\/uploads\/audio_[\w-]+\.webm$/);
    const filePath = path.join(TEST_UPLOAD_DIR, path.basename(result));
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('maps mime types to correct extensions', async () => {
    const { saveAudio } = await import('../utils/media');
    const base64 = Buffer.from('test').toString('base64');

    const tests: [string, RegExp][] = [
      ['audio/mpeg', /\.mp3$/],
      ['audio/mp4', /\.mp4$/],
      ['audio/ogg', /\.ogg$/],
      ['audio/aac', /\.aac$/],
      ['audio/webm', /\.webm$/],
      ['audio/unknown', /\.webm$/],
    ];

    for (const [mime, pattern] of tests) {
      const result = saveAudio(base64, mime);
      expect(result).toMatch(pattern);
    }
  });

  it('strips codec info from mime type', async () => {
    const { saveAudio } = await import('../utils/media');
    const base64 = Buffer.from('test').toString('base64');
    const result = saveAudio(base64, 'audio/webm;codecs=opus');
    expect(result).toMatch(/\.webm$/);
  });
});
