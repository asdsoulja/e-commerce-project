import { Prisma } from "@prisma/client";
import { DEFAULT_BILLING_LABEL, DEFAULT_SHIPPING_LABEL } from "./address.dao.js";
import { prisma } from "../lib/prisma.js";

export type SalesHistoryFilter = {
  customerEmail?: string;
  itemName?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export type CheckoutAddressInput = {
  street: string;
  province: string;
  country: string;
  zip: string;
  phone?: string;
};

export type CheckoutCardDefaults = {
  defaultCardHolder: string;
  defaultCardLast4: string;
  defaultCardExpiryMonth: string;
  defaultCardExpiryYear: string;
};

export type CheckoutCartItemInput = {
  itemId: string;
  quantity: number;
  unitPrice: number;
};

type CreateApprovedOrderInput = {
  userId: string;
  cartId: string;
  items: CheckoutCartItemInput[];
  shippingInput: CheckoutAddressInput;
  billingInput: CheckoutAddressInput;
  shippingLabel?: string;
  billingLabel?: string;
  shouldSaveAddressDefaults: boolean;
  shouldSavePaymentDefaults: boolean;
  cardDefaults: CheckoutCardDefaults;
};

const adminSalesUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true
} satisfies Prisma.UserSelect;

async function upsertDefaultAddress(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    label: string;
    address: CheckoutAddressInput;
  }
) {
  const existing = await tx.address.findFirst({
    where: {
      userId: input.userId,
      label: input.label
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (existing) {
    return tx.address.update({
      where: {
        id: existing.id
      },
      data: input.address
    });
  }

  return tx.address.create({
    data: {
      userId: input.userId,
      label: input.label,
      ...input.address
    }
  });
}

export async function listOrdersByUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { placedAt: "desc" },
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
}

export async function listAllOrders(filter?: SalesHistoryFilter) {
  const where = {
    user: filter?.customerEmail
      ? {
          email: {
            contains: filter.customerEmail
          }
        }
      : undefined,
    items: filter?.itemName
      ? {
          some: {
            item: {
              name: {
                contains: filter.itemName
              }
            }
          }
        }
      : undefined,
    placedAt:
      filter?.dateFrom || filter?.dateTo
        ? {
            gte: filter.dateFrom,
            lte: filter.dateTo
          }
        : undefined
  };

  return prisma.order.findMany({
    where,
    orderBy: { placedAt: "desc" },
    include: {
      user: {
        select: adminSalesUserSelect
      },
      items: {
        include: {
          item: true
        }
      },
      shippingAddress: true,
      billingAddress: true
    }
  });
}

export async function createPaymentAttempt() {
  return prisma.paymentAttempt.create({ data: {} });
}

export async function createApprovedOrder(input: CreateApprovedOrderInput) {
  return prisma.$transaction(async (tx) => {
    const shippingAddress = await tx.address.create({
      data: {
        userId: input.userId,
        ...input.shippingInput,
        label: input.shippingLabel ?? "shipping"
      }
    });

    const billingAddress = await tx.address.create({
      data: {
        userId: input.userId,
        ...input.billingInput,
        label: input.billingLabel ?? "billing"
      }
    });

    const total = input.items.reduce((sum, entry) => sum + entry.quantity * entry.unitPrice, 0);

    for (const entry of input.items) {
      await tx.item.update({
        where: {
          id: entry.itemId
        },
        data: {
          quantity: {
            decrement: entry.quantity
          }
        }
      });
    }

    const order = await tx.order.create({
      data: {
        userId: input.userId,
        status: "PAID",
        paymentStatus: "APPROVED",
        total,
        billingAddressId: billingAddress.id,
        shippingAddressId: shippingAddress.id,
        items: {
          create: input.items.map((entry) => ({
            itemId: entry.itemId,
            quantity: entry.quantity,
            priceAtPurchase: entry.unitPrice
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

    const profileUpdates: Array<Promise<unknown>> = [];

    if (input.shouldSaveAddressDefaults) {
      profileUpdates.push(
        upsertDefaultAddress(tx, {
          userId: input.userId,
          label: DEFAULT_SHIPPING_LABEL,
          address: input.shippingInput
        }),
        upsertDefaultAddress(tx, {
          userId: input.userId,
          label: DEFAULT_BILLING_LABEL,
          address: input.billingInput
        })
      );
    }

    if (input.shouldSavePaymentDefaults) {
      profileUpdates.push(
        tx.user.update({
          where: {
            id: input.userId
          },
          data: input.cardDefaults
        })
      );
    }

    if (profileUpdates.length > 0) {
      await Promise.all(profileUpdates);
    }

    await tx.cartItem.deleteMany({
      where: {
        cartId: input.cartId
      }
    });

    return order;
  });
}
