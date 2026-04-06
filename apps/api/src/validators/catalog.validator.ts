import { z } from "zod";

export const catalogQuerySchema = z.object({
  category: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
  sortBy: z.enum(["price", "name"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional()
});

export const itemIdParamSchema = z.object({
  itemId: z.string().min(1)
});
