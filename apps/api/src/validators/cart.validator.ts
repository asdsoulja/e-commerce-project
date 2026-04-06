import { z } from "zod";

export const addToCartSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().positive().max(99)
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive().max(99)
});

export const cartItemParamSchema = z.object({
  itemId: z.string().min(1)
});
