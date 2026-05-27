import xss from 'xss';

export function sanitise(input: string): string {
  return xss(input, { whiteList: {}, stripIgnoreTag: true });
}

export function sanitiseStrings<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    out[key] = typeof val === 'string' ? sanitise(val) : val;
  }
  return out as T;
}
