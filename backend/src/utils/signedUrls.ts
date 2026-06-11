import crypto from 'crypto';

const UPLOAD_RE = /^\/uploads\//;

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required for signed URLs');
  return secret;
}

export function signUploadPath(p: string | null): string | null {
  if (!p || !UPLOAD_RE.test(p)) return p;
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const sig = crypto.createHmac('sha256', getSecret()).update(p + exp).digest('hex');
  return `${p}?exp=${exp}&token=${sig}`;
}

export function verifyUpload(reqPath: string, exp: string, token: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (Number(exp) < now) return false;
  const expected = crypto.createHmac('sha256', getSecret()).update(reqPath + exp).digest('hex');
  return expected === token;
}

function walkAndSign(obj: unknown): unknown {
  if (typeof obj === 'string' && UPLOAD_RE.test(obj)) return signUploadPath(obj);
  if (Array.isArray(obj)) return obj.map(walkAndSign);
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = walkAndSign(v);
    }
    return result;
  }
  return obj;
}

export function signJsonResponse(body: unknown): unknown {
  return walkAndSign(body);
}
