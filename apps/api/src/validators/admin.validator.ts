import { z } from "zod";

export const salesQuerySchema = z.object({
  customerEmail: z.string().min(1).optional(),
  itemName: z.string().min(1).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export const inventoryParamSchema = z.object({
  itemId: z.string().min(1)
});

export const inventoryCreateSchema = z.object({
  sku: z.string().min(1).max(20),
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(255),
  category: z.string().min(1).max(50),
  brand: z.string().min(1).max(50),
  model: z.string().max(50).optional(),
  imageUrl: z.string().url().optional(),
  quantity: z.number().int().min(0),
  price: z.number().int().positive()
});

export const inventoryUpdateSchema = z
  .object({
    sku: z.string().min(1).max(20).optional(),
    name: z.string().min(1).max(80).optional(),
    description: z.string().min(1).max(255).optional(),
    category: z.string().min(1).max(50).optional(),
    brand: z.string().min(1).max(50).optional(),
    model: z.string().max(50).nullable().optional(),
    imageUrl: z.string().url().nullable().optional(),
    quantity: z.number().int().min(0).optional(),
    price: z.number().int().positive().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required"
  });

export const userParamSchema = z.object({
  userId: z.string().min(1)
});

export const userUpdateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().min(6).max(20).nullable().optional()
});
