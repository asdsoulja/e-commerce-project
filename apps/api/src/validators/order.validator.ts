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
  cardHolder: z.string().max(100).optional(),
  cardNumber: z.string().max(24).optional(),
  expiryMonth: z.string().optional(),
  expiryYear: z.string().optional(),
  cvv: z.string().optional()
});

export const checkoutSchema = z
  .object({
    billingAddress: addressSchema,
    shippingAddress: addressSchema,
    creditCard: creditCardSchema,
    useSavedPayment: z.boolean().optional(),
    saveAddressesAsDefault: z.boolean().optional(),
    savePaymentAsDefault: z.boolean().optional(),
    // Backward compatibility for existing test artifacts/clients.
    saveAsDefault: z.boolean().optional()
  })
  .superRefine((payload, ctx) => {
    const cardHolder = payload.creditCard.cardHolder?.trim() ?? "";
    const cardNumberRaw = payload.creditCard.cardNumber?.trim() ?? "";
    const expiryMonth = payload.creditCard.expiryMonth?.trim() ?? "";
    const expiryYear = payload.creditCard.expiryYear?.trim() ?? "";
    const cvv = payload.creditCard.cvv?.trim() ?? "";
    const normalizedCardNumber = cardNumberRaw.replace(/\D/g, "");
    const useSavedPayment = Boolean(payload.useSavedPayment);
    const usingSavedProfile = useSavedPayment && normalizedCardNumber.length === 0;

    if (usingSavedProfile) {
      return;
    }

    if (!cardNumberRaw) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Card number is required unless using saved payment profile",
        path: ["creditCard", "cardNumber"]
      });
      return;
    }

    if (!/^[0-9\-\s]+$/.test(cardNumberRaw)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Card number must contain only digits, spaces, or dashes",
        path: ["creditCard", "cardNumber"]
      });
    }

    if (normalizedCardNumber.length < 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Card number appears invalid",
        path: ["creditCard", "cardNumber"]
      });
    }

    if (cardHolder.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Card holder is required",
        path: ["creditCard", "cardHolder"]
      });
    }

    if (!/^(0[1-9]|1[0-2])$/.test(expiryMonth)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expiry month must be in MM format",
        path: ["creditCard", "expiryMonth"]
      });
    }

    if (!/^\d{4}$/.test(expiryYear)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expiry year must be 4 digits",
        path: ["creditCard", "expiryYear"]
      });
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CVV must be 3 or 4 digits",
        path: ["creditCard", "cvv"]
      });
    }
  });
