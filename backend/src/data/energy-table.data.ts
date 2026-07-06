// Verbatim copy of the energy requirement brackets from legacy/index.html (mechanically extracted).

export type EnergyBracket = [minMonths: number, maxMonths: number, maleKcal: number, femaleKcal: number];

export const ENERGY_TABLE: EnergyBracket[] = [
  [0,5,550,500],[6,11,700,650],[12,23,1000,950],[24,35,1200,1100],
  [36,47,1300,1200],[48,59,1400,1300],[60,83,1500,1400],[84,107,1700,1550],
  [108,131,2100,1900],[132,155,2400,2100],[156,179,2800,2300],[180,228,3000,2300]
];
