import { Prisma } from "@prisma/client";
import {
  DEFAULT_BILLING_LABEL,
  DEFAULT_SHIPPING_LABEL,
  upsertAddressByLabel
} from "../dao/address.dao.js";
import {
  createInventoryItem,
  deleteInventoryItem,
  findItemById,
  findItemBySku,
  listInventory,
  updateInventoryItem
} from "../dao/item.dao.js";
import { listAllOrders, SalesHistoryFilter } from "../dao/order.dao.js";
import { findUserById, listUsers, updateUser } from "../dao/user.dao.js";
import { AppError } from "../utils/app-error.js";

type AddressPayload = {
  street: string;
  province: string;
  country: string;
  zip: string;
  phone?: string;
};

type CreditCardPayload = {
  cardHolder: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
};

function normalizeCardNumber(cardNumber: string) {
  return cardNumber.replace(/\D/g, "");
}

function toCardDefaults(creditCard: CreditCardPayload) {
  const normalizedCardNumber = normalizeCardNumber(creditCard.cardNumber);
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

function sanitizeAddress(address: AddressPayload) {
  return {
    street: address.street.trim(),
    province: address.province.trim(),
    country: address.country.trim(),
    zip: address.zip.trim(),
    phone: address.phone?.trim() || undefined
  };
}

function mapDefaultAddress(
  addresses: Array<{
    label: string | null;
    street: string;
    province: string;
    country: string;
    zip: string;
    phone: string | null;
  }>,
  label: string
) {
  const address = addresses.find((entry) => entry.label === label);
  if (!address) {
    return null;
  }

  return {
    street: address.street,
    province: address.province,
    country: address.country,
    zip: address.zip,
    phone: address.phone
  };
}

type UserAccountProjection = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string | null;
  defaultCardLast4: string | null;
  addresses: Array<{
    label: string | null;
    street: string;
    province: string;
    country: string;
    zip: string;
    phone: string | null;
  }>;
};

function formatUserAccount(user: UserAccountProjection) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    phone: user.phone,
    defaultShippingAddress: mapDefaultAddress(user.addresses, DEFAULT_SHIPPING_LABEL),
    defaultBillingAddress: mapDefaultAddress(user.addresses, DEFAULT_BILLING_LABEL),
    paymentProfile: user.defaultCardLast4
      ? {
          cardLast4: user.defaultCardLast4
        }
      : null
  };
}

export async function getSalesHistory(filter?: SalesHistoryFilter) {
  return listAllOrders(filter);
}

export async function getInventory() {
  return listInventory();
}

export async function addInventoryItem(input: {
  sku: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  model?: string;
  imageUrl?: string;
  quantity: number;
  price: number;
}) {
  const sku = input.sku.trim();
  const existing = await findItemBySku(sku);
  if (existing) {
    throw new AppError(409, "An item with this SKU already exists");
  }

  return createInventoryItem({
    ...input,
    sku,
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    brand: input.brand.trim(),
    model: input.model?.trim() || undefined,
    imageUrl: input.imageUrl?.trim() || undefined
  });
}

export async function editInventoryItem(
  itemId: string,
  patch: {
    sku?: string;
    name?: string;
    description?: string;
    category?: string;
    brand?: string;
    model?: string | null;
    imageUrl?: string | null;
    quantity?: number;
    price?: number;
  }
) {
  const existingItem = await findItemById(itemId);
  if (!existingItem) {
    throw new AppError(404, "Item not found");
  }

  const sku = patch.sku?.trim();
  if (sku !== undefined) {
    if (!sku) {
      throw new AppError(400, "SKU cannot be empty");
    }

    const skuOwner = await findItemBySku(sku);
    if (skuOwner && skuOwner.id !== itemId) {
      throw new AppError(409, "An item with this SKU already exists");
    }
  }

  const name = patch.name?.trim();
  if (name !== undefined && !name) {
    throw new AppError(400, "Name cannot be empty");
  }

  const description = patch.description?.trim();
  if (description !== undefined && !description) {
    throw new AppError(400, "Description cannot be empty");
  }

  const category = patch.category?.trim();
  if (category !== undefined && !category) {
    throw new AppError(400, "Category cannot be empty");
  }

  const brand = patch.brand?.trim();
  if (brand !== undefined && !brand) {
    throw new AppError(400, "Brand cannot be empty");
  }

  const model = patch.model === undefined ? undefined : patch.model?.trim() || null;
  const imageUrl =
    patch.imageUrl === undefined ? undefined : patch.imageUrl?.trim() || null;

  return updateInventoryItem(itemId, {
    sku,
    name,
    description,
    category,
    brand,
    model,
    imageUrl,
    quantity: patch.quantity,
    price: patch.price
  });
}

export async function removeInventoryItem(itemId: string) {
  const item = await findItemById(itemId);
  if (!item) {
    throw new AppError(404, "Item not found");
  }

  return deleteInventoryItem(itemId);
}

export async function getUserAccounts() {
  const users = await listUsers();
  return users.map((user) => formatUserAccount(user));
}

export async function editUserAccount(
  userId: string,
  patch: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    shippingAddress?: AddressPayload;
    billingAddress?: AddressPayload;
    creditCard?: CreditCardPayload;
  }
) {
  const userPatch: Prisma.UserUpdateInput = {};

  if (patch.firstName !== undefined) {
    userPatch.firstName = patch.firstName.trim();
  }
  if (patch.lastName !== undefined) {
    userPatch.lastName = patch.lastName.trim();
  }
  if (patch.phone !== undefined) {
    userPatch.phone = patch.phone?.trim() || null;
  }
  if (patch.creditCard) {
    Object.assign(userPatch, toCardDefaults(patch.creditCard));
  }

  if (Object.keys(userPatch).length > 0) {
    await updateUser(userId, userPatch);
  }

  await Promise.all([
    patch.shippingAddress
      ? upsertAddressByLabel({
          userId,
          label: DEFAULT_SHIPPING_LABEL,
          ...sanitizeAddress(patch.shippingAddress)
        })
      : Promise.resolve(),
    patch.billingAddress
      ? upsertAddressByLabel({
          userId,
          label: DEFAULT_BILLING_LABEL,
          ...sanitizeAddress(patch.billingAddress)
        })
      : Promise.resolve()
  ]);

  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  return formatUserAccount(user);
}
