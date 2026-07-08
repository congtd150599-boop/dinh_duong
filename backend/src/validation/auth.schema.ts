import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ'),
  password: z.string().min(1, 'password is required'),
});

export type LoginPayload = z.infer<typeof loginSchema>;

// No `role` field on purpose — self-registration always lands as
// 'dieu_duong'/'pending' server-side (see user.service.ts's registerUser),
// an admin assigns the real role when approving.
export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Họ tên là bắt buộc'),
  email: z.string().trim().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

export type RegisterPayload = z.infer<typeof registerSchema>;
