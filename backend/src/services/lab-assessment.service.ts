import type { LabInputs, LabResult } from '@dinhduong/shared';

/**
 * Verbatim port of legacy/index.html assessLabs() (lines 2397-2479), with inputs
 * passed as a parameter object instead of read from the DOM.
 *
 * Deliberately preserves subtle boundary quirks from the original:
 * - Vitamin D: `status` is 'deficit' for BOTH <12 and 12-20, but `diagnosis` text
 *   distinguishes "nặng" (severe) vs "nhẹ" (mild) — do not collapse this.
 * - Cholesterol: `status` is 'excess' for BOTH >=170 and >=200, but `diagnosis`
 *   distinguishes "ranh giới" (borderline) vs "Tăng" (elevated) — same caution.
 * - A missing/blank lab input is simply omitted from the result array, never
 *   defaulted to a value.
 */
export function assessLabs(months: number, inputs: LabInputs): LabResult[] {
  const { ca, vitD, zn, hb, fe, ferritin, chol, tg } = inputs;

  const hbThreshold = months < 24 ? 105 : months < 60 ? 110 : months < 144 ? 115 : 120;
  const ferritinThreshold = months <= 60 ? 12 : 15;
  const tgThreshold = months < 120 ? 100 : 130;

  const labs: LabResult[] = [];

  if (ca !== null && ca !== undefined && !Number.isNaN(ca)) {
    labs.push({
      name: 'Calci toàn phần',
      icon: '🦴',
      value: ca,
      unit: 'mmol/L',
      normal: '2.1–2.6',
      status: ca < 2.1 ? 'deficit' : ca > 2.6 ? 'excess' : 'ok',
      diagnosis: ca < 2.1 ? 'Thiếu Calci (hạ calci huyết)' : ca > 2.6 ? 'Tăng calci huyết' : 'Bình thường',
      recommendation: ca < 2.1 ? 'Bổ sung Calci 500–1000mg/ngày. Uống nhiều sữa, ăn cua, tôm, cá nhỏ.' : '',
    });
  }

  if (vitD !== null && vitD !== undefined && !Number.isNaN(vitD)) {
    labs.push({
      name: 'Vitamin D 25(OH)D',
      icon: '☀️',
      value: vitD,
      unit: 'ng/mL',
      normal: '>20',
      status: vitD < 12 ? 'deficit' : vitD < 20 ? 'deficit' : 'ok',
      diagnosis:
        vitD < 12
          ? 'Thiếu Vitamin D nặng (<12 ng/mL)'
          : vitD < 20
            ? 'Thiếu Vitamin D nhẹ (12–20 ng/mL)'
            : 'Bình thường',
      recommendation:
        vitD < 20
          ? 'Bổ sung Vitamin D 2000–5000 IU/ngày trong 6–12 tuần, sau duy trì 400–1000 IU/ngày. Tắm nắng sáng 15–20 phút/ngày.'
          : '',
    });
  }

  if (zn !== null && zn !== undefined && !Number.isNaN(zn)) {
    labs.push({
      name: 'Kẽm huyết thanh',
      icon: '⚗️',
      value: zn,
      unit: 'µmol/L',
      normal: '10.7–20.0',
      status: zn < 10.7 ? 'deficit' : 'ok',
      diagnosis: zn < 10.7 ? 'Thiếu Kẽm' : 'Bình thường',
      recommendation: zn < 10.7 ? 'Bổ sung Kẽm 10–20mg/ngày trong 2–3 tháng. Tăng thịt bò, hải sản, hạt bí.' : '',
    });
  }

  if (hb !== null && hb !== undefined && !Number.isNaN(hb)) {
    labs.push({
      name: 'Hemoglobin (Hb)',
      icon: '🩸',
      value: hb,
      unit: 'g/L',
      normal: `≥${hbThreshold}`,
      status: hb < hbThreshold ? 'deficit' : 'ok',
      diagnosis: hb < hbThreshold ? `Thiếu máu (Hb < ${hbThreshold} g/L)` : 'Bình thường',
      recommendation:
        hb < hbThreshold ? 'Bổ sung Sắt 3–6mg/kg/ngày kết hợp Vitamin C. Ăn thịt đỏ, gan, rau màu xanh đậm.' : '',
    });
  }

  if (fe !== null && fe !== undefined && !Number.isNaN(fe)) {
    labs.push({
      name: 'Sắt huyết thanh',
      icon: '🔩',
      value: fe,
      unit: 'µmol/L',
      normal: '11.0–27.0',
      status: fe < 11 ? 'deficit' : fe > 27 ? 'excess' : 'ok',
      diagnosis: fe < 11 ? 'Thiếu sắt huyết thanh' : fe > 27 ? 'Sắt huyết thanh cao' : 'Bình thường',
      recommendation: fe < 11 ? 'Bổ sung Sắt kết hợp với Vitamin C, tránh uống cùng trà/cà phê.' : '',
    });
  }

  if (ferritin !== null && ferritin !== undefined && !Number.isNaN(ferritin)) {
    labs.push({
      name: 'Ferritin (Sắt dự trữ)',
      icon: '🏦',
      value: ferritin,
      unit: 'ng/mL',
      normal: `≥${ferritinThreshold}`,
      status: ferritin < ferritinThreshold ? 'deficit' : 'ok',
      diagnosis:
        ferritin < ferritinThreshold ? `Thiếu Sắt dự trữ (Ferritin < ${ferritinThreshold} ng/mL)` : 'Bình thường',
      recommendation:
        ferritin < ferritinThreshold ? 'Bổ sung Sắt nguyên tố 3–6mg/kg/ngày trong 2–3 tháng + Vitamin C.' : '',
    });
  }

  if (chol !== null && chol !== undefined && !Number.isNaN(chol)) {
    labs.push({
      name: 'Cholesterol toàn phần',
      icon: '💛',
      value: chol,
      unit: 'mg/dL',
      normal: '<170',
      status: chol >= 200 ? 'excess' : chol >= 170 ? 'excess' : 'ok',
      diagnosis:
        chol >= 200
          ? 'Tăng Cholesterol (≥200 mg/dL)'
          : chol >= 170
            ? 'Cholesterol ranh giới (170–199 mg/dL)'
            : 'Bình thường',
      recommendation:
        chol >= 170 ? 'Giảm béo bão hòa <7% tổng năng lượng. Cholesterol <200mg/ngày. Tăng hoạt động thể chất.' : '',
    });
  }

  if (tg !== null && tg !== undefined && !Number.isNaN(tg)) {
    labs.push({
      name: 'Triglycerid',
      icon: '🫀',
      value: tg,
      unit: 'mg/dL',
      normal: `<${tgThreshold}`,
      status: tg >= tgThreshold ? 'excess' : 'ok',
      diagnosis: tg >= tgThreshold ? `Tăng Triglycerid (≥${tgThreshold} mg/dL)` : 'Bình thường',
      recommendation:
        tg >= tgThreshold ? 'Giảm đường đơn, tăng omega-3 (cá hồi, hạt lanh). Hoạt động thể lực >60 phút/ngày.' : '',
    });
  }

  return labs;
}
