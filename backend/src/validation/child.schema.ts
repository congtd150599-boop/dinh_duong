import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Expected an ISO date string (YYYY-MM-DD)');

// Used by PUT /api/children/:id/guardians (ChildHistoryPanel's full edit form).
// All fields but relationship are optional/nullable here — the cross-field
// rule "name required if email/phone present" depends on the guardian's
// EXISTING state too (a field left out of this payload means "unchanged"),
// so it's enforced in guardian.service.ts's upsertGuardian, not here.
export const guardianInputSchema = z.object({
  relationship: z.enum(['Bố', 'Mẹ']),
  name: z.string().trim().nullable().optional(),
  dob: isoDate.nullable().optional(),
  address: z.string().trim().nullable().optional(),
  email: z.string().trim().email('Email không hợp lệ').nullable().optional(),
  phone: z.string().trim().min(8, 'Số điện thoại quá ngắn').max(20, 'Số điện thoại quá dài').nullable().optional(),
});

export type GuardianInputPayload = z.infer<typeof guardianInputSchema>;
