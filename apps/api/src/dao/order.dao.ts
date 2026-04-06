import { prisma } from "../lib/prisma.js";

export type SalesHistoryFilter = {
  customerEmail?: string;
  itemName?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

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
      user: true,
      items: {
        include: {
          item: true
        }
      }
    }
  });
}
