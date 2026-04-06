import { findItemById, ItemQuery, listItems } from "../dao/item.dao.js";
import { AppError } from "../utils/app-error.js";

export async function listCatalogItems(query: ItemQuery) {
  return listItems(query);
}

export async function getCatalogItem(itemId: string) {
  const item = await findItemById(itemId);
  if (!item) {
    throw new AppError(404, "Item not found");
  }

  return item;
}
