import { getCartWithItems } from "../dao/cart.dao.js";
import {
  DEFAULT_BILLING_LABEL,
  DEFAULT_SHIPPING_LABEL
} from "../dao/address.dao.js";
import { listOrdersByUser } from "../dao/order.dao.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/app-error.js";

type AddressPayload = {
  label?: string;
  street: string;
  province: string;
  country: string;
  zip: string;
  phone?: string;
};

type CreditCardPayload = {
  cardHolder: string;
  cardNumber?: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
};

type CheckoutPayload = {
  billingAddress: AddressPayload;
  shippingAddress: AddressPayload;
  creditCard: CreditCardPayload;
  useSavedPayment?: boolean;
  saveAsDefault?: boolean;
};

function sanitizeAddress(address: AddressPayload) {
  return {
    street: address.street.trim(),
    province: address.province.trim(),
    country: address.country.trim(),
    zip: address.zip.trim(),
    phone: address.phone?.trim() || undefined
  };
}

function normalizeCardNumber(cardNumber: string) {
  return cardNumber.replace(/\D/g, "");
}

function toCardDefaults(creditCard: CreditCardPayload) {
  const normalizedCardNumber = normalizeCardNumber(creditCard.cardNumber ?? "");
  if (normalizedCardNumber.length < 12) {
    throw new AppError(400, "Card number appears invalid");
  }

  return {
    defaultCardHolder: creditCard.cardHolder.trim(),
    defaultCardLast4: normalizedCardNumber.slice(-4),
    defaultCardExpiryMonth: creditCard.expiryMonth.trim(),
    defaultCardExpiryYear: creditCard.expiryYear.trim()
  };
}

async function resolveCardDefaultsForCheckout(
  userId: string,
  payload: CheckoutPayload
) {
  const normalizedCardNumber = normalizeCardNumber(payload.creditCard.cardNumber ?? "");
  if (normalizedCardNumber.length >= 12) {
    return toCardDefaults(payload.creditCard);
  }

  if (payload.useSavedPayment) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        defaultCardHolder: true,
        defaultCardLast4: true,
        defaultCardExpiryMonth: true,
        defaultCardExpiryYear: true
      }
    });

    if (
      !user?.defaultCardHolder ||
      !user.defaultCardLast4 ||
      !user.defaultCardExpiryMonth ||
      !user.defaultCardExpiryYear
    ) {
      throw new AppError(400, "No saved payment profile found. Enter a card number.");
    }

    return {
      defaultCardHolder: user.defaultCardHolder,
      defaultCardLast4: user.defaultCardLast4,
      defaultCardExpiryMonth: user.defaultCardExpiryMonth,
      defaultCardExpiryYear: user.defaultCardExpiryYear
    };
  }

  throw new AppError(400, "Card number appears invalid");
}

export async function checkout(userId: string, payload: CheckoutPayload) {
  const cart = await getCartWithItems(userId);

  if (!cart || cart.items.length === 0) {
    throw new AppError(400, "Shopping cart is empty");
  }

  for (const cartEntry of cart.items) {
    if (cartEntry.quantity > cartEntry.item.quantity) {
      throw new AppError(
        400,
        `Inventory shortage for ${cartEntry.item.name}. Reduce quantity and try checkout again.`
      );
    }
  }

  const attempt = await prisma.paymentAttempt.create({ data: {} });
  const approved = attempt.id % 3 !== 0;

  if (!approved) {
    return {
      approved: false,
      message: "Credit Card Authorization Failed."
    };
  }

  const shippingInput = sanitizeAddress(payload.shippingAddress);
  const billingInput = sanitizeAddress(payload.billingAddress);
  const cardDefaults = await resolveCardDefaultsForCheckout(userId, payload);
  const shouldSaveDefaults = payload.saveAsDefault ?? true;

  const result = await prisma.$transaction(async (tx) => {
    const shippingAddress = await tx.address.create({
      data: {
        userId,
        ...shippingInput,
        label: payload.shippingAddress.label ?? "shipping"
      }
    });

    const billingAddress = await tx.address.create({
      data: {
        userId,
        ...billingInput,
        label: payload.billingAddress.label ?? "billing"
      }
    });

    const total = cart.items.reduce((sum, entry) => sum + entry.quantity * entry.item.price, 0);

    for (const entry of cart.items) {
      await tx.item.update({
        where: { id: entry.item.id },
        data: {
          quantity: {
            decrement: entry.quantity
          }
        }
      });
    }

    const order = await tx.order.create({
      data: {
        userId,
        status: "PAID",
        paymentStatus: "APPROVED",
        total,
        billingAddressId: billingAddress.id,
        shippingAddressId: shippingAddress.id,
        items: {
          create: cart.items.map((entry) => ({
            itemId: entry.item.id,
            quantity: entry.quantity,
            priceAtPurchase: entry.item.price
          }))
        }
      },
      include: {
        items: {
          include: {
            item: true
          }
        },
        shippingAddress: true,
        billingAddress: true
      }
    });

    if (shouldSaveDefaults) {
      const existingShippingDefault = await tx.address.findFirst({
        where: {
          userId,
          label: DEFAULT_SHIPPING_LABEL
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      if (existingShippingDefault) {
        await tx.address.update({
          where: {
            id: existingShippingDefault.id
          },
          data: shippingInput
        });
      } else {
        await tx.address.create({
          data: {
            userId,
            label: DEFAULT_SHIPPING_LABEL,
            ...shippingInput
          }
        });
      }

      const existingBillingDefault = await tx.address.findFirst({
        where: {
          userId,
          label: DEFAULT_BILLING_LABEL
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      if (existingBillingDefault) {
        await tx.address.update({
          where: {
            id: existingBillingDefault.id
          },
          data: billingInput
        });
      } else {
        await tx.address.create({
          data: {
            userId,
            label: DEFAULT_BILLING_LABEL,
            ...billingInput
          }
        });
      }

      await tx.user.update({
        where: {
          id: userId
        },
        data: cardDefaults
      });
    }

    await tx.cartItem.deleteMany({
      where: {
        cartId: cart.id
      }
    });

    return order;
  });

  return {
    approved: true,
    message: "Order confirmed",
    order: result
  };
}

export async function getPurchaseHistory(userId: string) {
  return listOrdersByUser(userId);
}
