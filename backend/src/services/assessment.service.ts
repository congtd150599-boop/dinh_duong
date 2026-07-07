import { monthsBetween, type AssessmentInput, type AssessmentResult } from '@dinhduong/shared';
import type { AgeKey } from '../data/menu.data';
import { calcEnergy, calcMacros } from './energy.service';
import { assessLabs } from './lab-assessment.service';
import { applyMenuFilters } from './menu-filter.service';
import { buildMenuWithQuantities, getBaseMenu } from './menu.service';
import { getHfaLms, getHfaMedian, getWfaLms, getWfaMedian } from './growth-standards.service';
import { getWfhLms } from './wfh-lms.service';
import { computeZScores } from './z-score.service';

function getAgeKey(months: number): AgeKey {
  if (months < 12) return '6-12m';
  if (months < 24) return '12-24m';
  if (months < 72) return '3-5y';
  return '6y+';
}

/**
 * Pure orchestrator equivalent to legacy/index.html calculate() (lines 2164-2342).
 * No DOM, no Express, no DB — fully unit-testable in isolation.
 */
export function runAssessment(input: AssessmentInput): AssessmentResult {
  const months = monthsBetween(input.dob, input.examDate);
  const isBoy = input.gender === 'Nam';

  const whoWeight = getWfaMedian(input.gender, months);
  const whoHeight = getHfaMedian(input.gender, months);

  const bmi = parseFloat((input.weight / (input.height / 100) ** 2).toFixed(1));

  const { wfaZ, wfhZ, hfaZ, wfa, hfa, wfh } = computeZScores({
    weight: input.weight,
    height: input.height,
    wfaLms: getWfaLms(input.gender, months),
    hfaLms: getHfaLms(input.gender, months),
    wfhLms: getWfhLms(input.gender, months, input.height),
  });

  let muacStatus: string | null = null;
  if (input.muac) {
    if (input.muac < 11.5) muacStatus = '[!!] SDD CẤP NẶNG (<11.5cm)';
    else if (input.muac < 12.5) muacStatus = '[!] SDD CẤP VỪA (11.5–12.5cm)';
    else muacStatus = 'Bình thường (≥12.5cm)';
  }

  const ageKey = getAgeKey(months);
  let statusKey = 'Bình thường';
  if (wfhZ !== null && (wfhZ < -2 || (wfaZ !== null && wfaZ < -2))) statusKey = 'Suy dinh dưỡng';
  else if (hfaZ < -3 || (months > 60 && hfaZ < -2)) statusKey = 'Suy dinh dưỡng';
  else if (bmi >= 25 || (wfhZ !== null && wfhZ > 2) || (wfaZ !== null && wfaZ > 2)) statusKey = 'Thừa cân/Béo phì';

  const { stdEnergy, targetEnergy, energyNote, energyNoteType, energyNoteIcon } = calcEnergy(
    months,
    isBoy,
    input.weight,
    wfaZ,
    wfhZ,
    bmi,
  );

  const { carbG, proteinG, lipidG } = calcMacros(targetEnergy, statusKey);

  const labs = assessLabs(months, input.labs);

  const menuKey = `${ageKey}_${statusKey}`;
  const baseMenu = applyMenuFilters(getBaseMenu(ageKey, statusKey), input.menuFilters ?? {});
  const menu = buildMenuWithQuantities({
    baseMenu,
    months,
    targetEnergy,
    carbG,
    proteinG,
    lipidG,
    statusKey,
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
    wfaZ,
    hfaZ,
    wfhZ,
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
    menuKey,
    statusKey,
    tuvan: input.tuvan,
    revisit: input.revisit ?? null,
    guardianEmail: input.guardianEmail ?? null,
  };
}
