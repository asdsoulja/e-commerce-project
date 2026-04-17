import { z } from "zod";

const addressSchema = z.object({
  street: z.string().min(2).max(120),
  province: z.string().min(2).max(30),
  country: z.string().min(2).max(30),
  zip: z.string().min(3).max(20),
  phone: z.string().min(6).max(20).optional()
});

const creditCardSchema = z.object({
  cardHolder: z.string().min(2).max(100),
  cardNumber: z
    .string()
    .min(12)
    .max(24)
    .regex(/^[0-9\-\s]+$/, "Card number must contain only digits, spaces, or dashes"),
  expiryMonth: z
    .string()
    .regex(/^(0[1-9]|1[0-2])$/, "Expiry month must be in MM format"),
  expiryYear: z.string().regex(/^\d{4}$/, "Expiry year must be 4 digits"),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3 or 4 digits")
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().min(6).max(20).optional(),
  shippingAddress: addressSchema,
  billingAddress: addressSchema,
  creditCard: creditCardSchema
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100)
});

export const updateProfileSchema = z
  .object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    phone: z.string().min(6).max(20).nullable().optional(),
    shippingAddress: addressSchema.optional(),
    billingAddress: addressSchema.optional(),
    creditCard: creditCardSchema.optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required"
  });
