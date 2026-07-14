import type { Gender, LabInputs, LabResult, LabTestKey } from '@dinhduong/shared';
import { getLabReferenceRange, type LabReferenceRange } from './lab-reference.service';

/**
 * Port of legacy/index.html assessLabs() (lines 2397-2479), since generalized
 * to read its numeric thresholds from LabReferenceRange (DB-backed, admin-
 * editable via the "🧪 Chuẩn Xét Nghiệm" tab) instead of literals baked into
 * this file — see Bugs.md #11 for why (a real lab slip showed Sắt huyết
 * thanh is gender-specific and Cholesterol/Triglycerid are reported in
 * mmol/L, not the mg/dL this file used to assume; both are impossible to fix
 * cleanly, or ever get right for every lab's own calibration, with hardcoded
 * numbers).
 *
 * Deliberately preserves subtle boundary quirks from before the refactor:
 * - Vitamin D: `status` is 'deficit' for BOTH severe and mild, but `diagnosis`
 *   text distinguishes "nặng" (severe) vs "nhẹ" (mild) — do not collapse this.
 * - Cholesterol: `status` is 'excess' for BOTH borderline and elevated, but
 *   `diagnosis` distinguishes "ranh giới" (borderline) vs "Tăng" (elevated) —
 *   same caution.
 * - A missing/blank lab input is simply omitted from the result array, never
 *   defaulted to a value. A test with no matching LabReferenceRange row
 *   (should only happen if an admin's CSV import left a gap) is also omitted,
 *   logged once, rather than throwing and failing the whole assessment.
 */
export function assessLabs(months: number, gender: Gender, inputs: LabInputs): LabResult[] {
  const { ca, vitD, zn, hb, fe, ferritin, chol, tg } = inputs;
  const labs: LabResult[] = [];

  function push(testKey: LabTestKey, build: (r: LabReferenceRange) => LabResult | null) {
    const r = getLabReferenceRange(testKey, gender, months);
    if (!r) {
      console.warn(`[lab-assessment] Không tìm thấy LabReferenceRange cho testKey="${testKey}", gender="${gender}", months=${months}`);
      return;
    }
    const result = build(r);
    if (result) labs.push(result);
  }

  const highHit = (value: number, threshold: number, r: LabReferenceRange) => (r.highInclusive ? value >= threshold : value > threshold);

  if (ca !== null && ca !== undefined && !Number.isNaN(ca)) {
    push('ca', (r) => ({
      name: 'Calci toàn phần',
      icon: '🦴',
      value: ca,
      unit: r.unit,
      normal: `${r.lowDeficit}–${r.highExcess}`,
      status: ca < r.lowDeficit! ? 'deficit' : highHit(ca, r.highExcess!, r) ? 'excess' : 'ok',
      diagnosis: ca < r.lowDeficit! ? 'Thiếu Calci (hạ calci huyết)' : highHit(ca, r.highExcess!, r) ? 'Tăng calci huyết' : 'Bình thường',
      recommendation: ca < r.lowDeficit! ? 'Bổ sung Calci 500–1000mg/ngày. Uống nhiều sữa, ăn cua, tôm, cá nhỏ.' : '',
    }));
  }

  if (vitD !== null && vitD !== undefined && !Number.isNaN(vitD)) {
    push('vitD', (r) => ({
      name: 'Vitamin D 25(OH)D',
      icon: '☀️',
      value: vitD,
      unit: r.unit,
      normal: `>${r.lowDeficit}`,
      status: vitD < r.lowDeficit! ? 'deficit' : 'ok',
      diagnosis:
        vitD < r.lowSevere!
          ? `Thiếu Vitamin D nặng (<${r.lowSevere} ${r.unit})`
          : vitD < r.lowDeficit!
            ? `Thiếu Vitamin D nhẹ (${r.lowSevere}–${r.lowDeficit} ${r.unit})`
            : 'Bình thường',
      recommendation:
        vitD < r.lowDeficit!
          ? 'Bổ sung Vitamin D 2000–5000 IU/ngày trong 6–12 tuần, sau duy trì 400–1000 IU/ngày. Tắm nắng sáng 15–20 phút/ngày.'
          : '',
    }));
  }

  if (zn !== null && zn !== undefined && !Number.isNaN(zn)) {
    push('zn', (r) => ({
      name: 'Kẽm huyết thanh',
      icon: '⚗️',
      value: zn,
      unit: r.unit,
      normal: `≥${r.lowDeficit}`,
      status: zn < r.lowDeficit! ? 'deficit' : 'ok',
      diagnosis: zn < r.lowDeficit! ? 'Thiếu Kẽm' : 'Bình thường',
      recommendation: zn < r.lowDeficit! ? 'Bổ sung Kẽm 10–20mg/ngày trong 2–3 tháng. Tăng thịt bò, hải sản, hạt bí.' : '',
    }));
  }

  if (hb !== null && hb !== undefined && !Number.isNaN(hb)) {
    push('hb', (r) => ({
      name: 'Hemoglobin (Hb)',
      icon: '🩸',
      value: hb,
      unit: r.unit,
      normal: `≥${r.lowDeficit}`,
      status: hb < r.lowDeficit! ? 'deficit' : 'ok',
      diagnosis: hb < r.lowDeficit! ? `Thiếu máu (Hb < ${r.lowDeficit} ${r.unit})` : 'Bình thường',
      recommendation: hb < r.lowDeficit! ? 'Bổ sung Sắt 3–6mg/kg/ngày kết hợp Vitamin C. Ăn thịt đỏ, gan, rau màu xanh đậm.' : '',
    }));
  }

  if (fe !== null && fe !== undefined && !Number.isNaN(fe)) {
    push('fe', (r) => ({
      name: 'Sắt huyết thanh',
      icon: '🔩',
      value: fe,
      unit: r.unit,
      normal: `${r.lowDeficit}–${r.highExcess}`,
      status: fe < r.lowDeficit! ? 'deficit' : highHit(fe, r.highExcess!, r) ? 'excess' : 'ok',
      diagnosis: fe < r.lowDeficit! ? 'Thiếu sắt huyết thanh' : highHit(fe, r.highExcess!, r) ? 'Sắt huyết thanh cao' : 'Bình thường',
      recommendation: fe < r.lowDeficit! ? 'Bổ sung Sắt kết hợp với Vitamin C, tránh uống cùng trà/cà phê.' : '',
    }));
  }

  if (ferritin !== null && ferritin !== undefined && !Number.isNaN(ferritin)) {
    push('ferritin', (r) => ({
      name: 'Ferritin (Sắt dự trữ)',
      icon: '🏦',
      value: ferritin,
      unit: r.unit,
      normal: `≥${r.lowDeficit}`,
      status: ferritin < r.lowDeficit! ? 'deficit' : 'ok',
      diagnosis: ferritin < r.lowDeficit! ? `Thiếu Sắt dự trữ (Ferritin < ${r.lowDeficit} ${r.unit})` : 'Bình thường',
      recommendation: ferritin < r.lowDeficit! ? 'Bổ sung Sắt nguyên tố 3–6mg/kg/ngày trong 2–3 tháng + Vitamin C.' : '',
    }));
  }

  if (chol !== null && chol !== undefined && !Number.isNaN(chol)) {
    push('chol', (r) => {
      const excess = highHit(chol, r.highExcess!, r);
      const borderline = highHit(chol, r.highBorderline!, r);
      return {
        name: 'Cholesterol toàn phần',
        icon: '💛',
        value: chol,
        unit: r.unit,
        normal: `<${r.highBorderline}`,
        status: excess || borderline ? 'excess' : 'ok',
        diagnosis: excess
          ? `Tăng Cholesterol (≥${r.highExcess} ${r.unit})`
          : borderline
            ? `Cholesterol ranh giới (${r.highBorderline}–${r.highExcess} ${r.unit})`
            : 'Bình thường',
        recommendation: borderline || excess ? 'Giảm béo bão hòa <7% tổng năng lượng. Cholesterol <200mg/ngày. Tăng hoạt động thể chất.' : '',
      };
    });
  }

  if (tg !== null && tg !== undefined && !Number.isNaN(tg)) {
    push('tg', (r) => ({
      name: 'Triglycerid',
      icon: '🫀',
      value: tg,
      unit: r.unit,
      normal: `<${r.highExcess}`,
      status: highHit(tg, r.highExcess!, r) ? 'excess' : 'ok',
      diagnosis: highHit(tg, r.highExcess!, r) ? `Tăng Triglycerid (≥${r.highExcess} ${r.unit})` : 'Bình thường',
      recommendation: highHit(tg, r.highExcess!, r)
        ? 'Giảm đường đơn, tăng omega-3 (cá hồi, hạt lanh). Hoạt động thể lực >60 phút/ngày.'
        : '',
    }));
  }

  return labs;
}
