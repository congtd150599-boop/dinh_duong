import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Expected an ISO date string (YYYY-MM-DD)');

export const labInputsSchema = z.object({
  ca: z.number().nullable().optional(),
  vitD: z.number().nullable().optional(),
  zn: z.number().nullable().optional(),
  hb: z.number().nullable().optional(),
  fe: z.number().nullable().optional(),
  ferritin: z.number().nullable().optional(),
  chol: z.number().nullable().optional(),
  tg: z.number().nullable().optional(),
});

export const menuFiltersSchema = z.object({
  noSeafood: z.boolean().optional(),
  noEgg: z.boolean().optional(),
  noDairy: z.boolean().optional(),
  noPeanutNuts: z.boolean().optional(),
  vegetarian: z.boolean().optional(),
  noPork: z.boolean().optional(),
  noBeef: z.boolean().optional(),
});

// InputTab's quick "1 representative guardian" entry — if this object is
// sent at all, name/email/phone must all be present (it's meant to satisfy
// the "at least one qualifying guardian" rule in one go). dob/address are
// left to the fuller edit form in ChildHistoryPanel, not captured here.
export const representativeGuardianSchema = z.object({
  relationship: z.enum(['Bố', 'Mẹ']),
  name: z.string().trim().min(1, 'Cần nhập họ tên người đại diện'),
  email: z.string().trim().email('Email không hợp lệ'),
  phone: z.string().trim().min(8, 'Số điện thoại quá ngắn').max(20, 'Số điện thoại quá dài'),
});

export const assessmentInputSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  dob: isoDate,
  examDate: isoDate,
  weight: z.number().positive(),
  height: z.number().positive(),
  muac: z.number().positive().nullable().optional(),
  gender: z.enum(['Nam', 'Nữ']),
  tuvan: z.enum(['Có', 'Không']),
  revisit: isoDate.nullable().optional(),
  representativeGuardian: representativeGuardianSchema.nullable().optional(),
  menuFilters: menuFiltersSchema.optional(),
  labs: labInputsSchema.default({}),
  childId: z.string().cuid().nullable().optional(),
});

export type AssessmentInputPayload = z.infer<typeof assessmentInputSchema>;
