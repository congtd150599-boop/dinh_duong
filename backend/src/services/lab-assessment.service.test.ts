import { describe, expect, it } from 'vitest';
import { assessLabs } from './lab-assessment.service';

function labOf(months: number, inputs: Parameters<typeof assessLabs>[1], name: string) {
  return assessLabs(months, inputs).find((l) => l.name === name);
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

describe('assessLabs — Sắt (Fe) boundaries', () => {
  it('10.9 → deficit', () => expect(labOf(24, { fe: 10.9 }, 'Sắt huyết thanh')?.status).toBe('deficit'));
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

describe('assessLabs — Cholesterol: status collapses but diagnosis text must NOT', () => {
  it('169.9 → ok', () => expect(labOf(24, { chol: 169.9 }, 'Cholesterol toàn phần')?.status).toBe('ok'));
  it('170.0 → excess, diagnosis says "ranh giới"', () => {
    const l = labOf(24, { chol: 170.0 }, 'Cholesterol toàn phần');
    expect(l?.status).toBe('excess');
    expect(l?.diagnosis).toContain('ranh giới');
  });
  it('199.9 → excess, still "ranh giới"', () => {
    expect(labOf(24, { chol: 199.9 }, 'Cholesterol toàn phần')?.diagnosis).toContain('ranh giới');
  });
  it('200.0 → excess, diagnosis says "Tăng" (NOT ranh giới)', () => {
    const l = labOf(24, { chol: 200.0 }, 'Cholesterol toàn phần');
    expect(l?.status).toBe('excess');
    expect(l?.diagnosis).toContain('Tăng');
    expect(l?.diagnosis).not.toContain('ranh giới');
  });
});

describe('assessLabs — Triglycerid age threshold', () => {
  it('m=119 threshold 100: tg=99 ok, tg=100 excess', () => {
    expect(labOf(119, { tg: 99 }, 'Triglycerid')?.status).toBe('ok');
    expect(labOf(119, { tg: 100 }, 'Triglycerid')?.status).toBe('excess');
  });
  it('m=120 threshold rises to 130: tg=129 ok, tg=130 excess', () => {
    expect(labOf(120, { tg: 129 }, 'Triglycerid')?.status).toBe('ok');
    expect(labOf(120, { tg: 130 }, 'Triglycerid')?.status).toBe('excess');
  });
});

describe('assessLabs — missing inputs are omitted, not defaulted', () => {
  it('empty input object → empty labs array', () => {
    expect(assessLabs(24, {})).toEqual([]);
  });
  it('null/undefined values are omitted individually', () => {
    const labs = assessLabs(24, { ca: null, vitD: undefined, hb: 130 });
    expect(labs).toHaveLength(1);
    expect(labs[0].name).toBe('Hemoglobin (Hb)');
  });
});
