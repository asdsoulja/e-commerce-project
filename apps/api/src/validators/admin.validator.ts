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

export const userUpdateSchema = z
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
