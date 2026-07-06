import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ'),
  password: z.string().min(1, 'password is required'),
});

export type LoginPayload = z.infer<typeof loginSchema>;
