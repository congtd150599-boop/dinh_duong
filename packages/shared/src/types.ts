// Wire-format DTOs shared between frontend and backend.

export type Gender = 'Nam' | 'Nữ';
export type TuVan = 'Có' | 'Không';
export type LabStatus = 'deficit' | 'excess' | 'ok';
export type MealSlot = 'Sáng' | 'Phụ sáng' | 'Trưa' | 'Phụ chiều' | 'Tối' | 'Phụ tối';
export type Role = 'admin' | 'bac_si' | 'dieu_duong';

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

/** Menu exclusion toggles — a filter with none set means "no restriction". */
export interface MenuFilters {
  noSeafood?: boolean;
  noEgg?: boolean;
  noDairy?: boolean;
  noPeanutNuts?: boolean;
  vegetarian?: boolean;
  noPork?: boolean;
  noBeef?: boolean;
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
  guardianEmail?: string | null;
  menuFilters?: MenuFilters;
  labs: LabInputs;
  /** Set when the doctor picked an existing child from the search box in InputTab; omitted/null lets the backend find-or-create by name+dob. */
  childId?: string | null;
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
  guardianEmail: string | null;
}

/** Wire shape of a persisted Patient record as returned by the /api/patients endpoints. */
export interface PatientRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  childId: string;
  name: string;
  dob: string;
  examDate: string;
  gender: Gender;
  weight: number;
  height: number;
  muac: number | null;
  revisit: string | null;
  guardianEmail: string | null;
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

/** Wire shape of a staff account as returned by the /api/users and /api/auth endpoints. Never carries passwordHash. */
export interface UserRecord {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

export const FOOD_CATEGORIES = [
  'Tinh bột',
  'Đạm',
  'Rau củ',
  'Trái cây',
  'Sữa & chế phẩm',
  'Chất béo',
  'Hạt & đậu',
  'Khác',
] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

/** Fixed vocabulary for per-food contraindication tags — a checkbox list, not free text, so menus can later be filtered by patient condition. */
export const FOOD_CONDITION_TAGS = [
  'Tiểu đường',
  'Suy thận',
  'Gout',
  'Cao huyết áp',
  'Rối loạn lipid máu',
  'Suy dinh dưỡng',
  'Thừa cân/Béo phì',
  'Dị ứng đạm sữa bò',
  'Dị ứng hải sản',
  'Táo bón',
  'Tiêu chảy',
  'Trào ngược dạ dày',
  'Thiếu máu thiếu sắt',
] as const;
export type FoodConditionTag = (typeof FOOD_CONDITION_TAGS)[number];

/** Wire shape of a Food reference-data record as returned by the /api/foods endpoints. */
export interface FoodRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  category: FoodCategory;
  kcalPer100: number;
  proteinPer100: number;
  carbPer100: number;
  fatPer100: number;
  benefits: string | null;
  cautionNote: string | null;
  conditionTags: FoodConditionTag[];
  source: string | null;
  /** One of the ~20 core items menu.service.ts's dish-keyword matcher resolves to — cannot be deleted via the UI/API. */
  isSystemDefault: boolean;
}

/** Wire shape of a Child (persistent per-kid record spanning multiple visits) as returned by /api/children/search. */
export interface ChildRecord {
  id: string;
  name: string;
  dob: string;
  gender: Gender;
  /** Most recent visit's examDate for this child, or null if somehow it has none — helps a doctor disambiguate same-name children in the search dropdown. */
  lastExamDate: string | null;
}
