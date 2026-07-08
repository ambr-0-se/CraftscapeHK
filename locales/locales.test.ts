import { describe, it, expect } from 'vitest';
import { en } from './en';
import { zh } from './zh';

/**
 * Locale parity guard.
 *
 * `t()` is typed as `keyof typeof zh`, and it falls back to `en` when the active
 * language is missing a key. If the two dictionaries drift out of sync, a key can
 * be uncallable (missing in zh) or silently untranslated (missing in en). These
 * tests fail the build the moment that happens.
 */
describe('locale parity', () => {
  const enKeys = Object.keys(en).sort();
  const zhKeys = Object.keys(zh).sort();

  it('every English key has a Traditional Chinese counterpart', () => {
    const missingInZh = enKeys.filter((key) => !(key in zh));
    expect(missingInZh).toEqual([]);
  });

  it('every Traditional Chinese key has an English counterpart', () => {
    const missingInEn = zhKeys.filter((key) => !(key in en));
    expect(missingInEn).toEqual([]);
  });

  it('has an identical key set in both locales', () => {
    expect(enKeys).toEqual(zhKeys);
  });

  it('has no empty string values', () => {
    const emptyEn = enKeys.filter((key) => en[key as keyof typeof en] === '');
    const emptyZh = zhKeys.filter((key) => zh[key as keyof typeof zh] === '');
    expect({ emptyEn, emptyZh }).toEqual({ emptyEn: [], emptyZh: [] });
  });
});
