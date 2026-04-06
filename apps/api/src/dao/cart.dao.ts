import { prisma } from "../lib/prisma.js";

export async function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId }
  });
}

export async function getCartWithItems(userId: string) {
  await getOrCreateCart(userId);

  return prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          item: true
        },
        orderBy: {
          item: {
            name: "asc"
          }
        }
      }
    }
  });
}

export async function upsertCartItem(cartId: string, itemId: string, quantity: number) {
  return prisma.cartItem.upsert({
    where: {
      cartId_itemId: {
        cartId,
        itemId
      }
    },
    update: {
      quantity
    },
    create: {
      cartId,
      itemId,
      quantity
    }
  });
}

export async function removeCartItem(cartId: string, itemId: string) {
  return prisma.cartItem.deleteMany({
    where: {
      cartId,
      itemId
    }
  });
}

export async function clearCart(cartId: string) {
  return prisma.cartItem.deleteMany({
    where: {
      cartId
    }
  });
}
