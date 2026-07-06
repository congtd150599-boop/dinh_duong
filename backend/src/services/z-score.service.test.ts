import { describe, expect, it } from 'vitest';
import { classifyZ } from './z-score.service';

describe('classifyZ — wfa boundaries', () => {
  it('z = -3.01 → Nhẹ cân nặng (severe)', () => {
    expect(classifyZ(-3.01, 'wfa')).toBe('Nhẹ cân nặng');
  });
  it('z = -3.0 exactly → Nhẹ cân (NOT severe — code uses strict <)', () => {
    expect(classifyZ(-3.0, 'wfa')).toBe('Nhẹ cân');
  });
  it('z = -2.01 → Nhẹ cân', () => {
    expect(classifyZ(-2.01, 'wfa')).toBe('Nhẹ cân');
  });
  it('z = -2.0 exactly → Bình thường (NOT Nhẹ cân)', () => {
    expect(classifyZ(-2.0, 'wfa')).toBe('Bình thường');
  });
  it('z = 2.0 exactly → Bình thường (NOT Thừa cân)', () => {
    expect(classifyZ(2.0, 'wfa')).toBe('Bình thường');
  });
  it('z = 2.01 → Thừa cân', () => {
    expect(classifyZ(2.01, 'wfa')).toBe('Thừa cân');
  });
});

describe('classifyZ — hfa boundaries', () => {
  it('z = -3.01 → Thấp còi nặng', () => {
    expect(classifyZ(-3.01, 'hfa')).toBe('Thấp còi nặng');
  });
  it('z = -3.0 exactly → Thấp còi (not severe)', () => {
    expect(classifyZ(-3.0, 'hfa')).toBe('Thấp còi');
  });
  it('z = -2.01 → Thấp còi', () => {
    expect(classifyZ(-2.01, 'hfa')).toBe('Thấp còi');
  });
  it('z = -2.0 exactly → Bình thường', () => {
    expect(classifyZ(-2.0, 'hfa')).toBe('Bình thường');
  });
  it('z = 2.0 exactly → Bình thường', () => {
    expect(classifyZ(2.0, 'hfa')).toBe('Bình thường');
  });
  it('z = 2.01 → Cao hơn chuẩn', () => {
    expect(classifyZ(2.01, 'hfa')).toBe('Cao hơn chuẩn');
  });
});

describe('classifyZ — wfh boundaries', () => {
  it('z = -3.01 → SDD cấp nặng', () => {
    expect(classifyZ(-3.01, 'wfh')).toBe('SDD cấp nặng');
  });
  it('z = -3.0 exactly → Suy dinh dưỡng cấp (not severe)', () => {
    expect(classifyZ(-3.0, 'wfh')).toBe('Suy dinh dưỡng cấp');
  });
  it('z = -2.01 → Suy dinh dưỡng cấp', () => {
    expect(classifyZ(-2.01, 'wfh')).toBe('Suy dinh dưỡng cấp');
  });
  it('z = -2.0 exactly → Bình thường', () => {
    expect(classifyZ(-2.0, 'wfh')).toBe('Bình thường');
  });
  it('z = 2.0 exactly → Bình thường', () => {
    expect(classifyZ(2.0, 'wfh')).toBe('Bình thường');
  });
  it('z = 2.5 → Thừa cân (NOT Béo phì)', () => {
    expect(classifyZ(2.5, 'wfh')).toBe('Thừa cân');
  });
  it('z = 3.0 exactly → Thừa cân (not yet Béo phì)', () => {
    expect(classifyZ(3.0, 'wfh')).toBe('Thừa cân');
  });
  it('z = 3.01 → Béo phì', () => {
    expect(classifyZ(3.01, 'wfh')).toBe('Béo phì');
  });
});
