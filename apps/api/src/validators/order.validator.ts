import { z } from "zod";

const addressSchema = z.object({
  label: z.string().max(50).optional(),
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
    .min(4)
    .max(24)
    .regex(/^[0-9\-\s]+$/, "Card number must contain only digits, spaces, or dashes")
    .optional(),
  expiryMonth: z
    .string()
    .regex(/^(0[1-9]|1[0-2])$/, "Expiry month must be in MM format"),
  expiryYear: z.string().regex(/^\d{4}$/, "Expiry year must be 4 digits"),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3 or 4 digits")
});

export const checkoutSchema = z
  .object({
    billingAddress: addressSchema,
    shippingAddress: addressSchema,
    creditCard: creditCardSchema,
    useSavedPayment: z.boolean().optional(),
    saveAsDefault: z.boolean().optional()
  })
  .refine((payload) => payload.useSavedPayment || Boolean(payload.creditCard.cardNumber), {
    message: "Card number is required unless using saved payment profile",
    path: ["creditCard", "cardNumber"]
  });
