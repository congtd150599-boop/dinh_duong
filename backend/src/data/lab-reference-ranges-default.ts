// Bundled default lab reference ranges — seeds the LabReferenceRange table on
// first run; importing a CSV via the "🧪 Chuẩn Xét Nghiệm" tab replaces it
// wholesale (same pattern as growth-standards-who-default.ts). NOT hardcoded
// into the calculation logic itself (see lab-assessment.service.ts) — this is
// deliberately just data, swappable at runtime without a deploy.
//
// These are the exact same numeric thresholds that were previously hardcoded
// directly in lab-assessment.service.ts, split out here — with two corrections
// made while doing so, both prompted by a real lab slip the user shared
// (see Bugs.md #11):
//   - Cholesterol/Triglycerid are now in mmol/L, not mg/dL — the app's input
//     form has always asked for mg/dL but every real Vietnamese lab report
//     (including the one that prompted this) reports mmol/L, so a doctor
//     copying the number straight off the slip silently never triggered the
//     excess flag. Converted via the standard factors (cholesterol ÷38.67,
//     triglyceride ÷88.5) — the underlying clinical decision points (170/200
//     mg/dL, 100/130 mg/dL) are unchanged, only the unit is fixed.
//   - Sắt huyết thanh (Fe) is now representable per gender — the same lab
//     slip showed a female-specific range (10.7–32.2 µmol/L) distinct from
//     the app's single hardcoded 11.0–27.0. The bundled default below still
//     seeds Nam and Nữ with the *same* starting values (11.0–27.0, i.e. no
//     behavior change on deploy) rather than guessing at gender-specific
//     numbers from a partially-legible printout — a clinician should correct
//     these to their own lab's real per-gender range via CSV import.
import type { LabReferenceRange } from '../services/lab-reference.service';

const ALL_AGES: [number, number] = [0, 9999];
const LEGACY_SOURCE = 'Ngưỡng nội bộ trước đây (lab-assessment.service.ts, chưa ghi rõ nguồn tham chiếu gốc)';
const CONVERTED_SOURCE = 'Quy đổi mg/dL→mmol/L từ ngưỡng cũ (Bugs.md #11) — cùng điểm quyết định lâm sàng, chỉ sửa đơn vị';
const NEEDS_VERIFICATION_SOURCE = `${LEGACY_SOURCE} — CHƯA phân theo giới tính thật, cần đối chiếu lại với dải tham chiếu thật của phòng xét nghiệm đang dùng (xem Bugs.md #11)`;

export const DEFAULT_LAB_REFERENCE_RANGES: LabReferenceRange[] = [
  { testKey: 'ca', gender: 'Cả hai', minMonths: ALL_AGES[0], maxMonths: ALL_AGES[1], lowSevere: null, lowDeficit: 2.1, highBorderline: null, highExcess: 2.6, highInclusive: false, unit: 'mmol/L', source: LEGACY_SOURCE },

  { testKey: 'vitD', gender: 'Cả hai', minMonths: ALL_AGES[0], maxMonths: ALL_AGES[1], lowSevere: 12, lowDeficit: 20, highBorderline: null, highExcess: null, highInclusive: false, unit: 'ng/mL', source: LEGACY_SOURCE },

  { testKey: 'zn', gender: 'Cả hai', minMonths: ALL_AGES[0], maxMonths: ALL_AGES[1], lowSevere: null, lowDeficit: 10.7, highBorderline: null, highExcess: null, highInclusive: false, unit: 'µmol/L', source: LEGACY_SOURCE },

  { testKey: 'hb', gender: 'Cả hai', minMonths: 0, maxMonths: 23, lowSevere: null, lowDeficit: 105, highBorderline: null, highExcess: null, highInclusive: false, unit: 'g/L', source: LEGACY_SOURCE },
  { testKey: 'hb', gender: 'Cả hai', minMonths: 24, maxMonths: 59, lowSevere: null, lowDeficit: 110, highBorderline: null, highExcess: null, highInclusive: false, unit: 'g/L', source: LEGACY_SOURCE },
  { testKey: 'hb', gender: 'Cả hai', minMonths: 60, maxMonths: 143, lowSevere: null, lowDeficit: 115, highBorderline: null, highExcess: null, highInclusive: false, unit: 'g/L', source: LEGACY_SOURCE },
  { testKey: 'hb', gender: 'Cả hai', minMonths: 144, maxMonths: 9999, lowSevere: null, lowDeficit: 120, highBorderline: null, highExcess: null, highInclusive: false, unit: 'g/L', source: LEGACY_SOURCE },

  { testKey: 'fe', gender: 'Nam', minMonths: ALL_AGES[0], maxMonths: ALL_AGES[1], lowSevere: null, lowDeficit: 11.0, highBorderline: null, highExcess: 27.0, highInclusive: false, unit: 'µmol/L', source: NEEDS_VERIFICATION_SOURCE },
  { testKey: 'fe', gender: 'Nữ', minMonths: ALL_AGES[0], maxMonths: ALL_AGES[1], lowSevere: null, lowDeficit: 11.0, highBorderline: null, highExcess: 27.0, highInclusive: false, unit: 'µmol/L', source: NEEDS_VERIFICATION_SOURCE },

  { testKey: 'ferritin', gender: 'Cả hai', minMonths: 0, maxMonths: 60, lowSevere: null, lowDeficit: 12, highBorderline: null, highExcess: null, highInclusive: false, unit: 'ng/mL', source: LEGACY_SOURCE },
  { testKey: 'ferritin', gender: 'Cả hai', minMonths: 61, maxMonths: 9999, lowSevere: null, lowDeficit: 15, highBorderline: null, highExcess: null, highInclusive: false, unit: 'ng/mL', source: LEGACY_SOURCE },

  { testKey: 'chol', gender: 'Cả hai', minMonths: ALL_AGES[0], maxMonths: ALL_AGES[1], lowSevere: null, lowDeficit: null, highBorderline: 4.4, highExcess: 5.2, highInclusive: true, unit: 'mmol/L', source: CONVERTED_SOURCE },

  { testKey: 'tg', gender: 'Cả hai', minMonths: 0, maxMonths: 119, lowSevere: null, lowDeficit: null, highBorderline: null, highExcess: 1.13, highInclusive: true, unit: 'mmol/L', source: CONVERTED_SOURCE },
  { testKey: 'tg', gender: 'Cả hai', minMonths: 120, maxMonths: 9999, lowSevere: null, lowDeficit: null, highBorderline: null, highExcess: 1.47, highInclusive: true, unit: 'mmol/L', source: CONVERTED_SOURCE },
];
