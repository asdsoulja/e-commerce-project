import { findItemById, findItemsByIds } from "../dao/item.dao.js";
import {
  getCartWithItems,
  getOrCreateCart,
  removeCartItem,
  upsertCartItem
} from "../dao/cart.dao.js";
import { AppError } from "../utils/app-error.js";

export type GuestCartEntry = {
  itemId: string;
  quantity: number;
};

type CartItemView = {
  itemId: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  quantity: number;
  inventory: number;
  lineTotal: number;
  imageUrl: string | null;
};

type CartView = {
  id: string;
  items: CartItemView[];
  total: number;
};

type GuestCartResult = {
  cart: CartView;
  guestCart: GuestCartEntry[];
};

function formatItems(items: CartItemView[], id: string): CartView {
  return {
    id,
    items,
    total: items.reduce((sum, entry) => sum + entry.lineTotal, 0)
  };
}

function normalizeGuestCartEntries(entries: GuestCartEntry[] | undefined): GuestCartEntry[] {
  if (!entries || !Array.isArray(entries)) {
    return [];
  }

  const byItemId = new Map<string, number>();

  for (const entry of entries) {
    if (!entry || typeof entry.itemId !== "string") {
      continue;
    }

    const itemId = entry.itemId.trim();
    const quantity = Number(entry.quantity);

    if (!itemId || !Number.isFinite(quantity)) {
      continue;
    }

    const normalizedQuantity = Math.floor(quantity);
    if (normalizedQuantity <= 0) {
      continue;
    }

    byItemId.set(itemId, (byItemId.get(itemId) ?? 0) + normalizedQuantity);
  }

  return Array.from(byItemId, ([itemId, quantity]) => ({
    itemId,
    quantity
  }));
}

function getEmptyCart(id = ""): CartView {
  return {
    id,
    items: [],
    total: 0
  };
}

function formatUserCart(cart: Awaited<ReturnType<typeof getCartWithItems>>): CartView {
  if (!cart) {
    return getEmptyCart();
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
    lineTotal: entry.quantity * entry.item.price,
    imageUrl: entry.item.imageUrl ?? null
  }));

  return formatItems(items, cart.id);
}

async function buildGuestCart(entries: GuestCartEntry[] | undefined): Promise<GuestCartResult> {
  const normalizedEntries = normalizeGuestCartEntries(entries);
  if (normalizedEntries.length === 0) {
    return {
      cart: getEmptyCart("guest"),
      guestCart: []
    };
  }

  const itemIds = normalizedEntries.map((entry) => entry.itemId);
  const items = await findItemsByIds(itemIds);
  const itemById = new Map(items.map((item) => [item.id, item]));

  const guestCart: GuestCartEntry[] = [];
  const cartItems: CartItemView[] = [];

  for (const entry of normalizedEntries) {
    const item = itemById.get(entry.itemId);
    if (!item) {
      continue;
    }

    const maxAllowedQuantity = Math.max(0, item.quantity);
    if (maxAllowedQuantity === 0) {
      continue;
    }

    const quantity = Math.min(entry.quantity, maxAllowedQuantity);
    guestCart.push({
      itemId: item.id,
      quantity
    });

    cartItems.push({
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      brand: item.brand,
      category: item.category,
      price: item.price,
      quantity,
      inventory: item.quantity,
      lineTotal: quantity * item.price,
      imageUrl: item.imageUrl ?? null
    });
  }

  return {
    cart: formatItems(cartItems, "guest"),
    guestCart
  };
}

export async function getCart(userId: string) {
  const cart = await getCartWithItems(userId);
  return formatUserCart(cart);
}

export async function getGuestCart(entries: GuestCartEntry[] | undefined) {
  return buildGuestCart(entries);
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

export async function addItemToGuestCart(
  entries: GuestCartEntry[] | undefined,
  itemId: string,
  quantity: number
) {
  const item = await findItemById(itemId);
  if (!item) {
    throw new AppError(404, "Item not found");
  }

  const normalizedEntries = normalizeGuestCartEntries(entries);
  const quantityByItemId = new Map(normalizedEntries.map((entry) => [entry.itemId, entry.quantity]));
  const nextQuantity = (quantityByItemId.get(itemId) ?? 0) + quantity;

  if (nextQuantity > item.quantity) {
    throw new AppError(400, "Requested quantity exceeds inventory");
  }

  quantityByItemId.set(itemId, nextQuantity);

  return buildGuestCart(
    Array.from(quantityByItemId, ([nextItemId, nextItemQuantity]) => ({
      itemId: nextItemId,
      quantity: nextItemQuantity
    }))
  );
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

export async function updateGuestCartItem(
  entries: GuestCartEntry[] | undefined,
  itemId: string,
  quantity: number
) {
  const item = await findItemById(itemId);
  if (!item) {
    throw new AppError(404, "Item not found");
  }

  if (quantity > item.quantity) {
    throw new AppError(400, "Requested quantity exceeds inventory");
  }

  const normalizedEntries = normalizeGuestCartEntries(entries);
  const quantityByItemId = new Map(normalizedEntries.map((entry) => [entry.itemId, entry.quantity]));
  quantityByItemId.set(itemId, quantity);

  return buildGuestCart(
    Array.from(quantityByItemId, ([nextItemId, nextItemQuantity]) => ({
      itemId: nextItemId,
      quantity: nextItemQuantity
    }))
  );
}

export async function deleteCartItem(userId: string, itemId: string) {
  const cart = await getOrCreateCart(userId);
  await removeCartItem(cart.id, itemId);

  return getCart(userId);
}

export async function deleteGuestCartItem(
  entries: GuestCartEntry[] | undefined,
  itemId: string
) {
  const normalizedEntries = normalizeGuestCartEntries(entries).filter((entry) => entry.itemId !== itemId);
  return buildGuestCart(normalizedEntries);
}

export async function mergeGuestCartIntoUserCart(
  userId: string,
  entries: GuestCartEntry[] | undefined
) {
  const normalizedEntries = normalizeGuestCartEntries(entries);
  if (normalizedEntries.length === 0) {
    return getCart(userId);
  }

  const cart = await getOrCreateCart(userId);
  const currentCart = await getCartWithItems(userId);
  const currentQuantityByItemId = new Map(
    (currentCart?.items ?? []).map((entry) => [entry.itemId, entry.quantity])
  );
  const itemIds = normalizedEntries.map((entry) => entry.itemId);
  const items = await findItemsByIds(itemIds);
  const itemById = new Map(items.map((item) => [item.id, item]));

  for (const entry of normalizedEntries) {
    const item = itemById.get(entry.itemId);
    if (!item || item.quantity <= 0) {
      continue;
    }

    const existingQuantity = currentQuantityByItemId.get(entry.itemId) ?? 0;
    const mergedQuantity = Math.min(item.quantity, existingQuantity + entry.quantity);

    if (mergedQuantity <= 0) {
      continue;
    }

    await upsertCartItem(cart.id, item.id, mergedQuantity);
    currentQuantityByItemId.set(item.id, mergedQuantity);
  }

  return getCart(userId);
}
