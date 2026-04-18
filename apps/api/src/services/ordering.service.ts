import { getCartWithItems } from "../dao/cart.dao.js";
import {
  createApprovedOrder,
  createPaymentAttempt,
  listOrdersByUser
} from "../dao/order.dao.js";
import { findUserPaymentProfile } from "../dao/user.dao.js";
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
    const user = await findUserPaymentProfile(userId);

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

  const attempt = await createPaymentAttempt();
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

  const result = await createApprovedOrder({
    userId,
    cartId: cart.id,
    items: cart.items.map((entry) => ({
      itemId: entry.item.id,
      quantity: entry.quantity,
      unitPrice: entry.item.price
    })),
    shippingInput,
    billingInput,
    shippingLabel: payload.shippingAddress.label,
    billingLabel: payload.billingAddress.label,
    shouldSaveDefaults,
    cardDefaults
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
