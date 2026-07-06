import type { EnergyNoteType } from '@dinhduong/shared';
import { ENERGY_TABLE } from '../data/energy-table.data';

export interface EnergyResult {
  stdEnergy: number;
  targetEnergy: number;
  energyNote: string | null;
  energyNoteType: EnergyNoteType;
  energyNoteIcon: string;
}

/** Verbatim port of legacy/index.html calcEnergy() (lines 2366-2395). */
export function calcEnergy(
  months: number,
  isBoy: boolean,
  weight: number,
  wfaZ: number | null,
  wfhZ: number | null,
  bmi: number,
): EnergyResult {
  let stdEnergy = 1500;
  for (const [minM, maxM, mKcal, fKcal] of ENERGY_TABLE) {
    if (months >= minM && months <= maxM) {
      stdEnergy = isBoy ? mKcal : fKcal;
      break;
    }
  }

  let targetEnergy = stdEnergy;
  let energyNote: string | null = null;
  let energyNoteType: EnergyNoteType = 'info';
  let energyNoteIcon = 'ℹ️';

  if (bmi >= 25 || (wfaZ !== null && wfaZ > 2) || (wfhZ !== null && wfhZ > 2)) {
    targetEnergy = Math.round(stdEnergy * 0.8);
    energyNote =
      'Giảm 20% năng lượng do thừa cân/béo phì. Hạn chế béo bão hòa <7%, cholesterol <200mg/ngày. Tăng vận động ≥60 phút/ngày.';
    energyNoteType = 'warn';
    energyNoteIcon = '⚠️';
  } else if ((wfhZ !== null && wfhZ < -2) || (wfaZ !== null && wfaZ < -2)) {
    if (months < 60) {
      if (weight < 10) targetEnergy = Math.round(weight * 100);
      else if (weight < 20) targetEnergy = Math.round(1000 + 50 * (weight - 10));
      else targetEnergy = Math.round(1000 + 20 * (weight - 20));
    } else {
      targetEnergy = stdEnergy + 300;
    }
    energyNote = `Tăng năng lượng bắt kịp (catch-up). Protein ${months < 12 ? '3–4' : '2–3'}g/kg/ngày. Bổ sung vi chất Zn, Fe, Vit A, D.`;
    energyNoteType = 'danger';
    energyNoteIcon = '🚨';
  }

  return { stdEnergy, targetEnergy, energyNote, energyNoteType, energyNoteIcon };
}

export interface MacroResult {
  carbG: number;
  proteinG: number;
  lipidG: number;
}

/** Verbatim port of the macro-split logic inline in legacy calculate() (lines 2222-2229). */
export function calcMacros(targetEnergy: number, statusKey: string): MacroResult {
  let pCarb = 0.5;
  let pPro = 0.2;
  let pLipid = 0.3;
  if (statusKey.includes('Béo phì') || statusKey.includes('Thừa cân')) {
    pCarb = 0.35;
    pPro = 0.35;
  }
  return {
    carbG: Math.round((targetEnergy * pCarb) / 4),
    proteinG: Math.round((targetEnergy * pPro) / 4),
    lipidG: Math.round((targetEnergy * pLipid) / 9),
  };
}
