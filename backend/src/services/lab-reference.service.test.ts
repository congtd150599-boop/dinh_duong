import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_LAB_REFERENCE_RANGES } from '../data/lab-reference-ranges-default';
import { getAllLabReferenceRanges, getLabReferenceRange, loadRecords } from './lab-reference.service';

// These tests read the module-level cache, which loadRecords() mutates —
// always restore the real default afterward so other test files (and later
// tests in this file) see consistent data.
afterEach(() => {
  loadRecords(DEFAULT_LAB_REFERENCE_RANGES);
});

describe('getLabReferenceRange — age-ranged lookup (not exact-month keyed like GrowthStandardPoint)', () => {
  it('Hb: m=23 resolves the 0-23 bracket, m=24 resolves the next one', () => {
    expect(getLabReferenceRange('hb', 'Nam', 23)?.lowDeficit).toBe(105);
    expect(getLabReferenceRange('hb', 'Nam', 24)?.lowDeficit).toBe(110);
  });
  it('Ferritin: m=60 vs m=61 boundary', () => {
    expect(getLabReferenceRange('ferritin', 'Nữ', 60)?.lowDeficit).toBe(12);
    expect(getLabReferenceRange('ferritin', 'Nữ', 61)?.lowDeficit).toBe(15);
  });
  it('months below every bundled test\'s minMonths=0 → null (no silent fallback)', () => {
    expect(getLabReferenceRange('ca', 'Nam', -1)).toBeNull();
  });
});

describe('getLabReferenceRange — gender matching', () => {
  it('a gender-specific row (Sắt) only matches its own gender', () => {
    expect(getLabReferenceRange('fe', 'Nam', 24)?.gender).toBe('Nam');
    expect(getLabReferenceRange('fe', 'Nữ', 24)?.gender).toBe('Nữ');
  });
  it('a "Cả hai" row (Calci) matches either gender', () => {
    expect(getLabReferenceRange('ca', 'Nam', 24)?.gender).toBe('Cả hai');
    expect(getLabReferenceRange('ca', 'Nữ', 24)?.gender).toBe('Cả hai');
  });
});

describe('loadRecords — swaps the cache wholesale (used by CSV import)', () => {
  it('overrides a value and getters reflect it immediately', () => {
    loadRecords([
      { testKey: 'zn', gender: 'Cả hai', minMonths: 0, maxMonths: 9999, lowSevere: null, lowDeficit: 999, highBorderline: null, highExcess: null, highInclusive: false, unit: 'test', source: 'test override' },
    ]);
    expect(getLabReferenceRange('zn', 'Nam', 24)?.lowDeficit).toBe(999);
  });
  it('getAllLabReferenceRanges reflects the overridden set', () => {
    loadRecords([
      { testKey: 'zn', gender: 'Cả hai', minMonths: 0, maxMonths: 9999, lowSevere: null, lowDeficit: 999, highBorderline: null, highExcess: null, highInclusive: false, unit: 'test', source: 'test override' },
    ]);
    expect(getAllLabReferenceRanges()).toHaveLength(1);
  });
});

describe('default dataset sanity', () => {
  it('bundles a row (or age-banded set of rows) for every test key assessLabs supports', () => {
    const keys = new Set(DEFAULT_LAB_REFERENCE_RANGES.map((r) => r.testKey));
    expect(keys).toEqual(new Set(['ca', 'vitD', 'zn', 'hb', 'fe', 'ferritin', 'chol', 'tg']));
  });
});
