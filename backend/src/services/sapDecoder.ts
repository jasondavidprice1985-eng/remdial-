import { pool } from '../db';

export interface DecodedSapCode {
  code: string;
  family: { prefix: string; name: string } | null;
  range: { code: string; name: string; genericName: string; priceGroup: string } | null;
  width: number | null;   // mm
  hand: 'L' | 'R' | null;
  height: number | null;  // mm
  residue: string;        // characters we couldn't classify
}

// Family prefix → human-readable name. Derived from the descriptions in the
// Delivery Report. Order matters — longer prefixes must be tried first.
const FAMILIES: Array<{ prefix: string; name: string }> = [
  { prefix: 'HINGE',    name: 'Hinge' },
  { prefix: 'LTSDRIVE', name: 'Light driver' },
  { prefix: 'LTSVIV',   name: 'LED light strip' },
  { prefix: 'VENTGRILL',name: 'Vent grill' },
  { prefix: 'VARIATION',name: 'Price variation' },
  { prefix: 'FITTING',  name: 'Furniture fitting' },
  { prefix: 'SPLASH',   name: 'Splashback / upstand' },
  { prefix: 'ESP',      name: 'Carcase end support panel' },
  { prefix: 'MPP',      name: 'Carcase multi-purpose panel' },
  { prefix: 'BBBP',     name: 'Breakfast bar back panel' },
  { prefix: 'TWU',      name: 'Tall wall unit' },
  { prefix: 'APP',      name: 'Appliance unit' },
  { prefix: 'APF',      name: 'Appliance door / frame' },
  { prefix: 'PD',       name: 'Pan drawer unit' },
  { prefix: 'WM',       name: 'Wall medium' },
  { prefix: 'BW',       name: 'Base/wall combo' },
  { prefix: 'BU',       name: 'Base unit' },
  { prefix: 'BC',       name: 'Base corner unit' },
  { prefix: 'TW',       name: 'Tall wall' },
  { prefix: 'SSK',      name: 'Sink' },
  { prefix: 'CAP',      name: 'Cover cap' },
  { prefix: 'TH',       name: 'Worktop / panel sheet' },
  { prefix: 'PL',       name: 'Plinth' },
  { prefix: 'TF',       name: 'Tall filler' },
  { prefix: 'ET',       name: 'Edging' },
  { prefix: 'BW',       name: 'Base/wall' },
  { prefix: 'B',        name: 'Base unit' },
  { prefix: 'W',        name: 'Wall unit' },
  { prefix: 'T',        name: 'Tall unit' },
  { prefix: 'D',        name: 'Door' },
  { prefix: 'H',        name: 'Handle' },
];

let rangesCache: Array<{ code: string; range_name: string; generic_name: string; price_group: string }> | null = null;
let rangesCacheAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getRanges() {
  if (rangesCache && Date.now() - rangesCacheAt < CACHE_TTL) return rangesCache;
  const r = await pool.query('SELECT code, range_name, generic_name, price_group FROM sap_ranges');
  rangesCache = r.rows;
  rangesCacheAt = Date.now();
  // Sort longest first so multi-char codes match before shorter ones
  rangesCache.sort((a, b) => b.code.length - a.code.length);
  return rangesCache;
}

export function clearRangesCache(): void {
  rangesCache = null;
}

function matchFamily(prefix: string): { prefix: string; name: string } | null {
  const upper = prefix.toUpperCase();
  for (const f of FAMILIES) {
    if (upper.startsWith(f.prefix)) return f;
  }
  return null;
}

/**
 * Pull width, hand and height out of a code like "BW60LMGO808" or "W40L716".
 * Width is the first number group, hand is L or R touching it, height is the
 * last number group (typically 700+ mm).
 */
function parseDimensions(code: string): { width: number | null; hand: 'L' | 'R' | null; height: number | null; consumed: string } {
  let width: number | null = null;
  let hand: 'L' | 'R' | null = null;
  let height: number | null = null;
  let consumed = '';

  // Width: 2-digit shorthand (60 → 600mm) or full 3-digit. Look near the front.
  // Strip the family-prefix letters first.
  const prefixLen = (code.match(/^[A-Z]+/)?.[0] ?? '').length;
  const rest = code.slice(prefixLen);
  const widthMatch = rest.match(/^(\d{2,4})/);
  if (widthMatch) {
    const raw = parseInt(widthMatch[1], 10);
    const candidate = widthMatch[1].length === 2 ? raw * 10 : raw;
    if (candidate >= 100 && candidate <= 1200) {
      width = candidate;
      consumed += widthMatch[0];
      // Hand letter immediately after the digits?
      const after = rest.charAt(widthMatch[0].length);
      if (after === 'L' || after === 'R') {
        hand = after;
        consumed += after;
      }
    }
  }

  // Trailing 3-4 digit number = height (cabinets are 300–2400 mm).
  const heightMatch = code.match(/(\d{3,4})$/);
  if (heightMatch) {
    const n = parseInt(heightMatch[1], 10);
    if (n >= 300 && n <= 2400 && n !== width) {
      height = n;
    }
  }

  return { width, hand, height, consumed };
}

export async function decodeSapCode(rawCode: string): Promise<DecodedSapCode> {
  const code = rawCode.trim().toUpperCase();
  const ranges = await getRanges();

  // Find the longest range suffix that matches.
  // Allow it to be followed by a trailing height number (e.g. "...MCS802").
  let matchedRange: typeof ranges[number] | null = null;
  let withoutRange = code;
  for (const r of ranges) {
    const rc = r.code.toUpperCase();
    if (code.endsWith(rc)) {
      matchedRange = r;
      withoutRange = code.slice(0, -rc.length);
      break;
    }
    // Strip trailing height digits and try again
    const stripped = code.replace(/\d+$/, '');
    if (stripped.length < code.length && stripped.endsWith(rc)) {
      matchedRange = r;
      withoutRange = stripped.slice(0, -rc.length);
      break;
    }
  }

  const family = matchFamily(withoutRange);
  const { width, hand, height } = parseDimensions(code);

  // Figure out what we couldn't classify (residue)
  let residue = withoutRange;
  if (family) residue = residue.slice(family.prefix.length);
  // Strip any number/L/R we already consumed
  if (width !== null) residue = residue.replace(String(width), '');
  if (hand) residue = residue.replace(hand, '');
  residue = residue.replace(/\d+$/, '');

  return {
    code,
    family,
    range: matchedRange ? {
      code: matchedRange.code,
      name: matchedRange.range_name,
      genericName: matchedRange.generic_name,
      priceGroup: matchedRange.price_group,
    } : null,
    width,
    hand,
    height,
    residue,
  };
}

/** Given a code, return alternate-colour variants for the same price group. */
export async function alternateColours(code: string): Promise<Array<{ code: string; name: string; genericName: string }>> {
  const decoded = await decodeSapCode(code);
  if (!decoded.range) return [];
  const ranges = await getRanges();
  return ranges
    .filter(r => r.price_group === decoded.range!.priceGroup && r.code !== decoded.range!.code)
    .map(r => {
      const swapped = decoded.code.endsWith(decoded.range!.code)
        ? decoded.code.slice(0, -decoded.range!.code.length) + r.code
        : decoded.code.replace(decoded.range!.code, r.code);
      return { code: swapped, name: r.range_name, genericName: r.generic_name };
    });
}
