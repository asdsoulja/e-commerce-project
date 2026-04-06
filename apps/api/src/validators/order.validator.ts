import { z } from "zod";

const addressSchema = z.object({
  label: z.string().max(50).optional(),
  street: z.string().min(2).max(120),
  province: z.string().min(2).max(30),
  country: z.string().min(2).max(30),
  zip: z.string().min(3).max(20),
  phone: z.string().min(6).max(20).optional()
});

export const checkoutSchema = z.object({
  billingAddress: addressSchema,
  shippingAddress: addressSchema
});
