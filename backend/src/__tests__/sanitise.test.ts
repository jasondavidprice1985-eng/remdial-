import { describe, it, expect } from 'vitest';
import { sanitise, sanitiseStrings } from '../utils/sanitise';

describe('sanitise', () => {
  it('passes plain text through unchanged', () => {
    expect(sanitise('Hello world')).toBe('Hello world');
  });

  it('strips script tags', () => {
    expect(sanitise('<script>alert("xss")</script>')).not.toContain('<script');
  });

  it('strips event handlers', () => {
    expect(sanitise('<img onerror="alert(1)" src="x">')).not.toContain('onerror');
  });

  it('strips all HTML tags (whitelist is empty)', () => {
    expect(sanitise('<b>bold</b>')).toBe('bold');
    expect(sanitise('<a href="http://evil.com">click</a>')).toBe('click');
  });

  it('handles empty string', () => {
    expect(sanitise('')).toBe('');
  });

  it('preserves special characters that are not HTML', () => {
    expect(sanitise('Tom & Jerry < 5 > 2')).toContain('Tom');
    expect(sanitise('100% & done')).toContain('&');
  });
});

describe('sanitiseStrings', () => {
  it('sanitises all string values in an object', () => {
    const result = sanitiseStrings({
      name: '<script>bad</script>Jason',
      count: 42,
      active: true,
    });
    expect(result.name).not.toContain('<script');
    expect(result.name).toContain('Jason');
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
  });

  it('leaves non-string values untouched', () => {
    const result = sanitiseStrings({ items: ['a', 'b'], num: 3 });
    expect(result.items).toEqual(['a', 'b']);
    expect(result.num).toBe(3);
  });
});
