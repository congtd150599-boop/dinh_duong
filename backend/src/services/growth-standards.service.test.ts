import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GROWTH_STANDARDS } from '../data/growth-standards-who-default';
import { getAllRecords, getHfaMedian, getWfaMedian, loadRecords } from './growth-standards.service';

// These tests read the module-level cache, which loadRecords() mutates —
// always restore the real WHO default afterward so other test files (and
// later tests in this file) see consistent data.
afterEach(() => {
  loadRecords(DEFAULT_GROWTH_STANDARDS);
});

describe('getWfaMedian — m=60 vs m=61 boundary (WFA only tabulated to 5y)', () => {
  it('m=60 → returns a numeric median', () => {
    expect(getWfaMedian('Nam', 60)).toBeCloseTo(18.3, 1);
    expect(getWfaMedian('Nữ', 60)).toBeCloseTo(18.2, 1);
  });
  it('m=61 → returns null (beyond WFA table)', () => {
    expect(getWfaMedian('Nam', 61)).toBeNull();
    expect(getWfaMedian('Nữ', 61)).toBeNull();
  });
});

describe('getHfaMedian — m=228 top-of-table and beyond (WHO 2007 reference)', () => {
  it('m=228 → returns the last tabulated value', () => {
    expect(getHfaMedian('Nam', 228)).toBeCloseTo(176.5, 1);
    expect(getHfaMedian('Nữ', 228)).toBeCloseTo(163.2, 1);
  });
  it('m=300 (beyond table) → capped at m=228 value (Math.min(m,228))', () => {
    expect(getHfaMedian('Nam', 300)).toBe(getHfaMedian('Nam', 228));
    expect(getHfaMedian('Nữ', 300)).toBe(getHfaMedian('Nữ', 228));
  });
});

describe('getWfaMedian/getHfaMedian — gender split at same month (WHO 2006 standard, 0-60mo)', () => {
  it('WFA at m=24 differs by gender', () => {
    expect(getWfaMedian('Nam', 24)).toBeCloseTo(12.1, 1);
    expect(getWfaMedian('Nữ', 24)).toBeCloseTo(11.5, 1);
  });
  it('HFA at m=24 differs by gender', () => {
    expect(getHfaMedian('Nam', 24)).toBeCloseTo(87.8, 1);
    expect(getHfaMedian('Nữ', 24)).toBeCloseTo(86.4, 1);
  });
});

describe('HFA plausibility — corrected data no longer shows girls implausibly taller than boys', () => {
  // Historical bug: the old hardcoded WHO_GIRLS_HFA had girls 6-9cm TALLER
  // than boys from ~6y to ~13y, which is not clinically plausible. The
  // correct pattern: boys slightly taller pre-puberty, girls briefly taller
  // ~10-13y (earlier growth spurt), boys taller again after ~14y.
  it('at 8 years (m=96), boys and girls are close, boys marginally taller', () => {
    const boys = getHfaMedian('Nam', 96);
    const girls = getHfaMedian('Nữ', 96);
    expect(Math.abs(boys - girls)).toBeLessThan(2);
    expect(boys).toBeGreaterThan(girls);
  });
  it('at 11 years (m=132), girls are taller than boys (earlier growth spurt)', () => {
    const boys = getHfaMedian('Nam', 132);
    const girls = getHfaMedian('Nữ', 132);
    expect(girls).toBeGreaterThan(boys);
    expect(girls - boys).toBeLessThan(3); // plausible margin, not the old 6-9cm gap
  });
  it('at 15 years (m=180), boys are taller again (later, larger growth spurt)', () => {
    const boys = getHfaMedian('Nam', 180);
    const girls = getHfaMedian('Nữ', 180);
    expect(boys).toBeGreaterThan(girls);
  });
});

describe('loadRecords — swaps the cache wholesale (used by CSV import)', () => {
  it('overrides a value and getters reflect it immediately', () => {
    loadRecords([{ gender: 'Nam', metric: 'HFA', months: 24, median: 999, source: 'test override' }]);
    expect(getHfaMedian('Nam', 24)).toBe(999);
  });
  it('getAllRecords reflects the overridden set', () => {
    loadRecords([{ gender: 'Nam', metric: 'HFA', months: 24, median: 999, source: 'test override' }]);
    const all = getAllRecords();
    expect(all).toHaveLength(1);
    expect(all[0].median).toBe(999);
  });
});

describe('default dataset sanity', () => {
  it('bundles 580 records (229 HFA months x 2 sexes + 61 WFA months x 2 sexes)', () => {
    expect(DEFAULT_GROWTH_STANDARDS).toHaveLength(580);
  });
});
