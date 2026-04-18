import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export type ItemQuery = {
  category?: string;
  brand?: string;
  model?: string;
  search?: string;
  sortBy?: "price" | "name";
  sortOrder?: "asc" | "desc";
};

export async function listItems(query: ItemQuery) {
  const where: Prisma.ItemWhereInput = {
    category: query.category,
    brand: query.brand,
    model: query.model,
    OR: query.search
      ? [
          { name: { contains: query.search } },
          { description: { contains: query.search } },
          { category: { contains: query.search } },
          { brand: { contains: query.search } }
        ]
      : undefined
  };

  const orderBy = query.sortBy
    ? { [query.sortBy]: query.sortOrder ?? "asc" }
    : { name: "asc" as const };

  return prisma.item.findMany({
    where,
    orderBy
  });
}

export async function findItemById(id: string) {
  return prisma.item.findUnique({
    where: { id }
  });
}

export async function findItemBySku(sku: string) {
  return prisma.item.findUnique({
    where: { sku }
  });
}

export async function findItemsByIds(ids: string[]) {
  return prisma.item.findMany({
    where: {
      id: { in: ids }
    }
  });
}

export async function listInventory() {
  return prisma.item.findMany({
    orderBy: { name: "asc" }
  });
}

export async function updateInventoryItem(itemId: string, data: Prisma.ItemUpdateInput) {
  return prisma.item.update({
    where: { id: itemId },
    data
  });
}

export async function deleteInventoryItem(itemId: string) {
  return prisma.item.delete({
    where: { id: itemId }
  });
}

export async function createInventoryItem(data: Prisma.ItemCreateInput) {
  return prisma.item.create({ data });
}
