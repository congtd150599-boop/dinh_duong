import { describe, expect, it } from 'vitest';
import { assessLabs } from './lab-assessment.service';

function labOf(months: number, inputs: Parameters<typeof assessLabs>[2], name: string, gender: Parameters<typeof assessLabs>[1] = 'Nam') {
  return assessLabs(months, gender, inputs).find((l) => l.name === name);
}

describe('assessLabs — Calci boundaries', () => {
  it('2.09 → deficit', () => expect(labOf(24, { ca: 2.09 }, 'Calci toàn phần')?.status).toBe('deficit'));
  it('2.10 → ok', () => expect(labOf(24, { ca: 2.1 }, 'Calci toàn phần')?.status).toBe('ok'));
  it('2.60 → ok', () => expect(labOf(24, { ca: 2.6 }, 'Calci toàn phần')?.status).toBe('ok'));
  it('2.61 → excess', () => expect(labOf(24, { ca: 2.61 }, 'Calci toàn phần')?.status).toBe('excess'));
});

describe('assessLabs — Vitamin D: status collapses but diagnosis text must NOT', () => {
  it('11.9 → deficit, diagnosis says "nặng"', () => {
    const l = labOf(24, { vitD: 11.9 }, 'Vitamin D 25(OH)D');
    expect(l?.status).toBe('deficit');
    expect(l?.diagnosis).toContain('nặng');
  });
  it('12.0 → deficit, diagnosis says "nhẹ" (NOT nặng)', () => {
    const l = labOf(24, { vitD: 12.0 }, 'Vitamin D 25(OH)D');
    expect(l?.status).toBe('deficit');
    expect(l?.diagnosis).toContain('nhẹ');
  });
  it('19.9 → deficit, still "nhẹ"', () => {
    expect(labOf(24, { vitD: 19.9 }, 'Vitamin D 25(OH)D')?.status).toBe('deficit');
  });
  it('20.0 → ok', () => {
    expect(labOf(24, { vitD: 20.0 }, 'Vitamin D 25(OH)D')?.status).toBe('ok');
  });
});

describe('assessLabs — Kẽm boundaries', () => {
  it('10.6 → deficit', () => expect(labOf(24, { zn: 10.6 }, 'Kẽm huyết thanh')?.status).toBe('deficit'));
  it('10.7 → ok', () => expect(labOf(24, { zn: 10.7 }, 'Kẽm huyết thanh')?.status).toBe('ok'));
});

describe('assessLabs — Hb age-threshold transitions', () => {
  it('m=23 threshold 105, hb=104 → deficit; hb=105 → ok', () => {
    expect(labOf(23, { hb: 104 }, 'Hemoglobin (Hb)')?.status).toBe('deficit');
    expect(labOf(23, { hb: 105 }, 'Hemoglobin (Hb)')?.status).toBe('ok');
  });
  it('m=24 threshold rises to 110, hb=109 → deficit; hb=110 → ok', () => {
    expect(labOf(24, { hb: 109 }, 'Hemoglobin (Hb)')?.status).toBe('deficit');
    expect(labOf(24, { hb: 110 }, 'Hemoglobin (Hb)')?.status).toBe('ok');
  });
  it('m=59 threshold 110, m=60 threshold rises to 115', () => {
    expect(labOf(59, { hb: 110 }, 'Hemoglobin (Hb)')?.status).toBe('ok');
    expect(labOf(60, { hb: 110 }, 'Hemoglobin (Hb)')?.status).toBe('deficit');
    expect(labOf(60, { hb: 115 }, 'Hemoglobin (Hb)')?.status).toBe('ok');
  });
  it('m=143 threshold 115, m=144 threshold rises to 120', () => {
    expect(labOf(143, { hb: 115 }, 'Hemoglobin (Hb)')?.status).toBe('ok');
    expect(labOf(144, { hb: 115 }, 'Hemoglobin (Hb)')?.status).toBe('deficit');
    expect(labOf(144, { hb: 120 }, 'Hemoglobin (Hb)')?.status).toBe('ok');
  });
});

describe('assessLabs — Sắt (Fe) boundaries (same bundled range for both genders today — see Bugs.md #11)', () => {
  it('10.9 → deficit (Nam and Nữ)', () => {
    expect(labOf(24, { fe: 10.9 }, 'Sắt huyết thanh', 'Nam')?.status).toBe('deficit');
    expect(labOf(24, { fe: 10.9 }, 'Sắt huyết thanh', 'Nữ')?.status).toBe('deficit');
  });
  it('11.0 → ok', () => expect(labOf(24, { fe: 11.0 }, 'Sắt huyết thanh')?.status).toBe('ok'));
  it('27.0 → ok', () => expect(labOf(24, { fe: 27.0 }, 'Sắt huyết thanh')?.status).toBe('ok'));
  it('27.1 → excess', () => expect(labOf(24, { fe: 27.1 }, 'Sắt huyết thanh')?.status).toBe('excess'));
});

describe('assessLabs — Ferritin threshold shift at m=60/61', () => {
  it('m=60 threshold 12: ferritin=11 deficit, 12 ok', () => {
    expect(labOf(60, { ferritin: 11 }, 'Ferritin (Sắt dự trữ)')?.status).toBe('deficit');
    expect(labOf(60, { ferritin: 12 }, 'Ferritin (Sắt dự trữ)')?.status).toBe('ok');
  });
  it('m=61 threshold rises to 15: ferritin=14 deficit, 15 ok', () => {
    expect(labOf(61, { ferritin: 14 }, 'Ferritin (Sắt dự trữ)')?.status).toBe('deficit');
    expect(labOf(61, { ferritin: 15 }, 'Ferritin (Sắt dự trữ)')?.status).toBe('ok');
  });
});

describe('assessLabs — Cholesterol (mmol/L, not mg/dL — see Bugs.md #11): status collapses but diagnosis text must NOT', () => {
  it('4.39 → ok', () => expect(labOf(24, { chol: 4.39 }, 'Cholesterol toàn phần')?.status).toBe('ok'));
  it('4.4 → excess, diagnosis says "ranh giới"', () => {
    const l = labOf(24, { chol: 4.4 }, 'Cholesterol toàn phần');
    expect(l?.status).toBe('excess');
    expect(l?.diagnosis).toContain('ranh giới');
  });
  it('5.19 → excess, still "ranh giới"', () => {
    expect(labOf(24, { chol: 5.19 }, 'Cholesterol toàn phần')?.diagnosis).toContain('ranh giới');
  });
  it('5.2 → excess, diagnosis says "Tăng" (NOT ranh giới)', () => {
    const l = labOf(24, { chol: 5.2 }, 'Cholesterol toàn phần');
    expect(l?.status).toBe('excess');
    expect(l?.diagnosis).toContain('Tăng');
    expect(l?.diagnosis).not.toContain('ranh giới');
  });
  it('unit is mmol/L', () => expect(labOf(24, { chol: 4.0 }, 'Cholesterol toàn phần')?.unit).toBe('mmol/L'));
});

describe('assessLabs — Triglycerid age threshold (mmol/L, not mg/dL — see Bugs.md #11)', () => {
  it('m=119 threshold 1.13: tg=1.12 ok, tg=1.13 excess', () => {
    expect(labOf(119, { tg: 1.12 }, 'Triglycerid')?.status).toBe('ok');
    expect(labOf(119, { tg: 1.13 }, 'Triglycerid')?.status).toBe('excess');
  });
  it('m=120 threshold rises to 1.47: tg=1.46 ok, tg=1.47 excess', () => {
    expect(labOf(120, { tg: 1.46 }, 'Triglycerid')?.status).toBe('ok');
    expect(labOf(120, { tg: 1.47 }, 'Triglycerid')?.status).toBe('excess');
  });
  it('unit is mmol/L', () => expect(labOf(24, { tg: 1.0 }, 'Triglycerid')?.unit).toBe('mmol/L'));
});

describe('assessLabs — missing inputs are omitted, not defaulted', () => {
  it('empty input object → empty labs array', () => {
    expect(assessLabs(24, 'Nam', {})).toEqual([]);
  });
  it('null/undefined values are omitted individually', () => {
    const labs = assessLabs(24, 'Nam', { ca: null, vitD: undefined, hb: 130 });
    expect(labs).toHaveLength(1);
    expect(labs[0].name).toBe('Hemoglobin (Hb)');
  });
});
