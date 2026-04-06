import {
  createInventoryItem,
  listInventory,
  updateInventory
} from "../dao/item.dao.js";
import { listAllOrders, SalesHistoryFilter } from "../dao/order.dao.js";
import { listUsers, updateUser } from "../dao/user.dao.js";

export async function getSalesHistory(filter?: SalesHistoryFilter) {
  return listAllOrders(filter);
}

export async function getInventory() {
  return listInventory();
}

export async function changeInventory(itemId: string, quantity: number) {
  return updateInventory(itemId, quantity);
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
  return createInventoryItem(input);
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
