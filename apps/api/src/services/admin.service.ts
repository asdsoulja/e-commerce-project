import {
  createInventoryItem,
  deleteInventoryItem,
  findItemById,
  findItemBySku,
  listInventory,
  updateInventoryItem
} from "../dao/item.dao.js";
import { listAllOrders, SalesHistoryFilter } from "../dao/order.dao.js";
import { listUsers, updateUser } from "../dao/user.dao.js";
import { AppError } from "../utils/app-error.js";

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
  return listUsers();
}

export async function editUserAccount(
  userId: string,
  patch: { firstName?: string; lastName?: string; phone?: string | null }
) {
  return updateUser(userId, {
    firstName: patch.firstName,
    lastName: patch.lastName,
    phone: patch.phone
  });
}
