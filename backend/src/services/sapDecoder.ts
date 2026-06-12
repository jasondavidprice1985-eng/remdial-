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
let carcaseCache: Array<{ suffix: string; colour_name: string; short_code: string | null }> | null = null;
let cacheAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function loadCaches() {
  if (rangesCache && carcaseCache && Date.now() - cacheAt < CACHE_TTL) return;
  const [r1, r2] = await Promise.all([
    pool.query('SELECT code, range_name, generic_name, price_group FROM sap_ranges'),
    pool.query('SELECT suffix, colour_name, short_code FROM sap_carcase_colours'),
  ]);
  rangesCache = r1.rows.sort((a, b) => b.code.length - a.code.length);
  carcaseCache = r2.rows.sort((a, b) => b.suffix.length - a.suffix.length);
  cacheAt = Date.now();
}

async function getRanges() {
  await loadCaches();
  return rangesCache!;
}

async function getCarcaseColours() {
  await loadCaches();
  return carcaseCache!;
}

export function clearRangesCache(): void {
  rangesCache = null;
  carcaseCache = null;
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
  const carcaseColours = await getCarcaseColours();

  // The colour suffix may be followed by a trailing height number (e.g. "MCS802").
  // Try matching with-height and without.
  const codeNoHeight = code.replace(/\d+$/, '');

  // Collect every candidate (door range + carcase suffix) that matches either
  // the full code or the height-stripped version, then pick the LONGEST suffix.
  // This stops 2-char "LS" (Sea Mist) beating 3-char "MLS" (Light Grey).
  type Candidate = { suffix: string; range: { code: string; name: string; genericName: string; priceGroup: string }; base: string };
  const candidates: Candidate[] = [];

  for (const r of ranges) {
    const rc = r.code.toUpperCase();
    if (code.endsWith(rc)) {
      candidates.push({ suffix: rc, range: { code: r.code, name: r.range_name, genericName: r.generic_name, priceGroup: r.price_group }, base: code.slice(0, -rc.length) });
    } else if (codeNoHeight.length < code.length && codeNoHeight.endsWith(rc)) {
      candidates.push({ suffix: rc, range: { code: r.code, name: r.range_name, genericName: r.generic_name, priceGroup: r.price_group }, base: codeNoHeight.slice(0, -rc.length) });
    }
  }
  for (const c of carcaseColours) {
    const cs = c.suffix.toUpperCase();
    if (code.endsWith(cs)) {
      candidates.push({ suffix: cs, range: { code: c.suffix, name: c.colour_name, genericName: c.colour_name, priceGroup: 'carcase' }, base: code.slice(0, -cs.length) });
    } else if (codeNoHeight.length < code.length && codeNoHeight.endsWith(cs)) {
      candidates.push({ suffix: cs, range: { code: c.suffix, name: c.colour_name, genericName: c.colour_name, priceGroup: 'carcase' }, base: codeNoHeight.slice(0, -cs.length) });
    }
  }

  candidates.sort((a, b) => b.suffix.length - a.suffix.length);
  const best = candidates[0] || null;
  const matchedRange = best?.range || null;
  const withoutColour = best?.base ?? code;

  const family = matchFamily(withoutColour);
  const { width, hand, height } = parseDimensions(code);

  // Figure out what we couldn't classify (residue)
  let residue = withoutColour;
  if (family) residue = residue.slice(family.prefix.length);
  if (width !== null) {
    const shorthand = width >= 100 && width < 1000 && width % 10 === 0 ? String(width / 10) : String(width);
    residue = residue.replace(shorthand, '');
  }
  if (hand) residue = residue.replace(hand, '');
  residue = residue.replace(/\d+$/, '');

  return {
    code,
    family,
    range: matchedRange,
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
