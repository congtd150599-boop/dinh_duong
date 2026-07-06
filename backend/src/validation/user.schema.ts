import { z } from 'zod';

const roleSchema = z.enum(['admin', 'bac_si', 'dieu_duong']);

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  email: z.string().trim().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
  role: roleSchema,
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    role: roleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.name !== undefined || v.role !== undefined || v.isActive !== undefined, {
    message: 'Cần ít nhất một trường để cập nhật',
  });

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

export type CreateUserPayload = z.infer<typeof createUserSchema>;
export type UpdateUserPayload = z.infer<typeof updateUserSchema>;
