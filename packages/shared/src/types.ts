// Wire-format DTOs shared between frontend and backend.

export type Gender = 'Nam' | 'Nữ';
export type TuVan = 'Có' | 'Không';
export type LabStatus = 'deficit' | 'excess' | 'ok';
export type MealSlot = 'Sáng' | 'Phụ sáng' | 'Trưa' | 'Phụ chiều' | 'Tối' | 'Phụ tối';

export interface LabInputs {
  ca?: number | null;
  vitD?: number | null;
  zn?: number | null;
  hb?: number | null;
  fe?: number | null;
  ferritin?: number | null;
  chol?: number | null;
  tg?: number | null;
}

export interface LabResult {
  name: string;
  icon: string;
  value: number;
  unit: string;
  normal: string;
  status: LabStatus;
  diagnosis: string;
  recommendation: string;
}

export interface AssessmentInput {
  name: string;
  dob: string; // ISO date
  examDate: string; // ISO date
  weight: number;
  height: number;
  muac?: number | null;
  gender: Gender;
  tuvan: TuVan;
  revisit?: string | null;
  labs: LabInputs;
}

export interface MenuIngredient {
  icon: string;
  amount: number;
  unit: string;
  label: string;
}

export interface MenuDish {
  dishName: string;
  mealKcal: number;
  ingredients: MenuIngredient[];
}

export type WeeklyMenu = {
  [K in MealSlot]: (MenuDish | '—')[];
} & { note: string };

export type EnergyNoteType = 'info' | 'warn' | 'danger';

export interface AssessmentResult {
  name: string;
  dob: string;
  examDate: string;
  weight: number;
  height: number;
  bmi: number;
  muac: number | null;
  gender: Gender;
  months: number;
  whoWeight: number | null;
  whoHeight: number;
  wfa: string;
  hfa: string;
  wfh: string;
  wfaZ: number | null;
  hfaZ: number;
  wfhZ: number | null;
  muacStatus: string | null;
  stdEnergy: number;
  targetEnergy: number;
  energyNote: string | null;
  energyNoteType: EnergyNoteType;
  energyNoteIcon: string;
  carbG: number;
  proteinG: number;
  lipidG: number;
  labs: LabResult[];
  menu: WeeklyMenu;
  menuKey: string;
  statusKey: string;
  tuvan: TuVan;
  revisit: string | null;
}

/** Wire shape of a persisted Patient record as returned by the /api/patients endpoints. */
export interface PatientRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  dob: string;
  examDate: string;
  gender: Gender;
  weight: number;
  height: number;
  muac: number | null;
  revisit: string | null;
  tuvan: TuVan;
  labCa: number | null;
  labVitD: number | null;
  labZn: number | null;
  labHb: number | null;
  labFe: number | null;
  labFerritin: number | null;
  labChol: number | null;
  labTg: number | null;
  months: number;
  bmi: number;
  wfa: string;
  hfa: string;
  wfh: string;
  muacStatus: string | null;
  stdEnergy: number;
  targetEnergy: number;
  carbG: number;
  proteinG: number;
  lipidG: number;
  labAssessmentSummary: string;
  fullResult: AssessmentResult;
  /** Computed display order (1-based), not stored — see plan notes on the legacy stt bug. */
  stt: number;
}
