import { findItemById } from "../dao/item.dao.js";
import {
  getCartWithItems,
  getOrCreateCart,
  removeCartItem,
  upsertCartItem
} from "../dao/cart.dao.js";
import { AppError } from "../utils/app-error.js";

function formatCart(cart: Awaited<ReturnType<typeof getCartWithItems>>) {
  if (!cart) {
    return {
      id: "",
      items: [],
      total: 0
    };
  }

  const items = cart.items.map((entry) => ({
    itemId: entry.item.id,
    sku: entry.item.sku,
    name: entry.item.name,
    brand: entry.item.brand,
    category: entry.item.category,
    price: entry.item.price,
    quantity: entry.quantity,
    inventory: entry.item.quantity,
    lineTotal: entry.quantity * entry.item.price
  }));

  const total = items.reduce((sum, entry) => sum + entry.lineTotal, 0);

  return {
    id: cart.id,
    items,
    total
  };
}

export async function getCart(userId: string) {
  const cart = await getCartWithItems(userId);
  return formatCart(cart);
}

export async function addItemToCart(userId: string, itemId: string, quantity: number) {
  const item = await findItemById(itemId);
  if (!item) {
    throw new AppError(404, "Item not found");
  }

  if (quantity > item.quantity) {
    throw new AppError(400, "Requested quantity exceeds inventory");
  }

  const cart = await getOrCreateCart(userId);

  const currentCart = await getCartWithItems(userId);
  const existing = currentCart?.items.find((entry) => entry.itemId === itemId);
  const nextQuantity = (existing?.quantity ?? 0) + quantity;

  if (nextQuantity > item.quantity) {
    throw new AppError(400, "Requested quantity exceeds inventory");
  }

  await upsertCartItem(cart.id, itemId, nextQuantity);

  return getCart(userId);
}

export async function updateCartItem(userId: string, itemId: string, quantity: number) {
  const item = await findItemById(itemId);
  if (!item) {
    throw new AppError(404, "Item not found");
  }

  if (quantity > item.quantity) {
    throw new AppError(400, "Requested quantity exceeds inventory");
  }

  const cart = await getOrCreateCart(userId);
  await upsertCartItem(cart.id, itemId, quantity);

  return getCart(userId);
}

export async function deleteCartItem(userId: string, itemId: string) {
  const cart = await getOrCreateCart(userId);
  await removeCartItem(cart.id, itemId);

  return getCart(userId);
}
