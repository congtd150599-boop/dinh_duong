import { FOOD_CATEGORIES, FOOD_CONDITION_TAGS } from '@dinhduong/shared';
import { z } from 'zod';

const categorySchema = z.enum(FOOD_CATEGORIES);
const conditionTagSchema = z.enum(FOOD_CONDITION_TAGS);

export const createFoodSchema = z.object({
  name: z.string().trim().min(1, 'Tên thực phẩm là bắt buộc'),
  category: categorySchema,
  kcalPer100: z.number().nonnegative(),
  proteinPer100: z.number().nonnegative().optional(),
  carbPer100: z.number().nonnegative().optional(),
  fatPer100: z.number().nonnegative().optional(),
  costPer100: z.number().nonnegative().nullable().optional(),
  preferenceScore: z.number().int().min(1).max(5).optional(),
  benefits: z.string().trim().nullable().optional(),
  cautionNote: z.string().trim().nullable().optional(),
  conditionTags: z.array(conditionTagSchema).optional(),
  source: z.string().trim().nullable().optional(),
});

export const updateFoodSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    category: categorySchema.optional(),
    kcalPer100: z.number().nonnegative().optional(),
    proteinPer100: z.number().nonnegative().optional(),
    carbPer100: z.number().nonnegative().optional(),
    fatPer100: z.number().nonnegative().optional(),
    costPer100: z.number().nonnegative().nullable().optional(),
    preferenceScore: z.number().int().min(1).max(5).optional(),
    benefits: z.string().trim().nullable().optional(),
    cautionNote: z.string().trim().nullable().optional(),
    conditionTags: z.array(conditionTagSchema).optional(),
    source: z.string().trim().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Cần ít nhất một trường để cập nhật' });

export type CreateFoodPayload = z.infer<typeof createFoodSchema>;
export type UpdateFoodPayload = z.infer<typeof updateFoodSchema>;
