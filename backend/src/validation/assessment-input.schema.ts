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
  labs: labInputsSchema.default({}),
});

export type AssessmentInputPayload = z.infer<typeof assessmentInputSchema>;
