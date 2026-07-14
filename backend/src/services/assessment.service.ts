import { monthsBetween, type AssessmentInput, type AssessmentResult } from '@dinhduong/shared';
import { calcEnergy, calcMacros } from './energy.service';
import { assessLabs } from './lab-assessment.service';
import { generateOptimizedMenu } from './menu-optimizer.service';
import { getHfaLms, getHfaMedian, getWfaLms, getWfaMedian } from './growth-standards.service';
import { getWfhLms } from './wfh-lms.service';
import { getBfaLms } from './bfa-lms.service';
import { computeZScores } from './z-score.service';

/**
 * Pure orchestrator equivalent to legacy/index.html calculate() (lines 2164-2342).
 * No DOM, no Express, no DB — fully unit-testable in isolation.
 */
export function runAssessment(input: AssessmentInput): AssessmentResult {
  const months = monthsBetween(input.dob, input.examDate);
  const isBoy = input.gender === 'Nam';

  const whoWeight = getWfaMedian(input.gender, months);
  const whoHeight = getHfaMedian(input.gender, months);

  const bmiRaw = input.weight / (input.height / 100) ** 2;
  const bmi = parseFloat(bmiRaw.toFixed(1));

  const { wfaZ, wfhZ, hfaZ, bfaZ, wfa, hfa, wfh, bfa } = computeZScores({
    weight: input.weight,
    height: input.height,
    // bmiRaw, not the display-rounded `bmi` — Bugs.md #7: rounding to 1
    // decimal before the LMS formula could flip a classification right at a
    // razor-thin SD boundary (the code elsewhere distinguishes z=2.00 from
    // z=2.01), which display rounding should never be able to do.
    bmi: bmiRaw,
    months,
    wfaLms: getWfaLms(input.gender, months),
    hfaLms: getHfaLms(input.gender, months),
    wfhLms: getWfhLms(input.gender, months, input.height),
    bfaLms: getBfaLms(input.gender, months),
  });

  let muacStatus: string | null = null;
  if (input.muac) {
    if (input.muac < 11.5) muacStatus = '[!!] SDD CẤP NẶNG (<11.5cm)';
    else if (input.muac < 12.5) muacStatus = '[!] SDD CẤP VỪA (11.5–12.5cm)';
    else muacStatus = 'Bình thường (≥12.5cm)';
  }

  // <5 tuổi: wfhZ và bfaZ dùng chung ngưỡng +2SD/+3SD (WHO coi CN/CC và
  // BMI/tuổi tương đương ở tuổi này — Bảng 1), OR cả 2 luôn an toàn. ≥5 tuổi:
  // wfhZ/wfaZ luôn null (WHO không công bố quá 5 tuổi) nên chỉ còn bfaZ, với
  // ngưỡng lỏng hơn +1SD/+2SD (WHO 2007). Trước đây dùng "bmi >= 25" (ngưỡng
  // người lớn) cho mọi tuổi — xem Bugs.md #1 ("Hướng dẫn điều trị Nhi khoa
  // 2025" tr.148).
  const overweightSd = months <= 60 ? 2 : 1;
  const isWasted = (wfhZ !== null && wfhZ < -2) || (wfaZ !== null && wfaZ < -2) || (bfaZ !== null && bfaZ < -2);
  const isOverweight = (wfhZ !== null && wfhZ > 2) || (bfaZ !== null && bfaZ > overweightSd);
  // Thấp còi (hfaZ<-2) — ngưỡng đồng nhất theo mọi lứa tuổi (Bảng 1), không
  // còn phân biệt <-3 cho ≤60 tháng / <-2 cho >60 tháng như trước (Bugs.md #2).
  let statusKey = 'Bình thường';
  if (isWasted) statusKey = 'Suy dinh dưỡng';
  else if (hfaZ < -2) statusKey = 'Suy dinh dưỡng';
  else if (isOverweight) statusKey = 'Thừa cân/Béo phì';

  const { stdEnergy, targetEnergy, energyNote, energyNoteType, energyNoteIcon } = calcEnergy(
    months,
    isBoy,
    input.weight,
    wfaZ,
    wfhZ,
    bfaZ,
  );

  const { carbG, proteinG, lipidG } = calcMacros(targetEnergy, statusKey);

  const labs = assessLabs(months, input.gender, input.labs);

  const menu = generateOptimizedMenu({
    months,
    targetEnergy,
    carbG,
    proteinG,
    lipidG,
    statusKey,
    filters: input.menuFilters ?? {},
  });

  return {
    name: input.name,
    dob: input.dob,
    examDate: input.examDate,
    weight: input.weight,
    height: input.height,
    bmi,
    muac: input.muac ?? null,
    gender: input.gender,
    months,
    whoWeight,
    whoHeight,
    wfa,
    hfa,
    wfh,
    bfa,
    wfaZ,
    hfaZ,
    wfhZ,
    bfaZ,
    muacStatus,
    stdEnergy,
    targetEnergy,
    energyNote,
    energyNoteType,
    energyNoteIcon,
    carbG,
    proteinG,
    lipidG,
    labs,
    menu,
    statusKey,
    tuvan: input.tuvan,
    revisit: input.revisit ?? null,
  };
}
