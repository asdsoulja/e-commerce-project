import { getCartWithItems } from "../dao/cart.dao.js";
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

type CheckoutPayload = {
  billingAddress: AddressPayload;
  shippingAddress: AddressPayload;
};

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

  const result = await prisma.$transaction(async (tx) => {
    const shippingAddress = await tx.address.create({
      data: {
        userId,
        ...payload.shippingAddress,
        label: payload.shippingAddress.label ?? "shipping"
      }
    });

    const billingAddress = await tx.address.create({
      data: {
        userId,
        ...payload.billingAddress,
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
