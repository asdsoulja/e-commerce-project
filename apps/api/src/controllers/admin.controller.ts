import { Request, Response } from "express";
import {
  addInventoryItem,
  editInventoryItem,
  editUserAccount,
  getInventory,
  getSalesHistory,
  getUserAccounts,
  removeInventoryItem
} from "../services/admin.service.js";
import { AppError } from "../utils/app-error.js";

export async function sales(req: Request, res: Response) {
  const rawDateFrom = typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined;
  const rawDateTo = typeof req.query.dateTo === "string" ? req.query.dateTo : undefined;

  const dateFrom = rawDateFrom ? new Date(rawDateFrom) : undefined;
  const dateTo = rawDateTo ? new Date(rawDateTo) : undefined;
  if (dateFrom && Number.isNaN(dateFrom.valueOf())) {
    throw new AppError(400, "Invalid dateFrom value");
  }
  if (dateTo && Number.isNaN(dateTo.valueOf())) {
    throw new AppError(400, "Invalid dateTo value");
  }
  if (dateTo) {
    dateTo.setUTCHours(23, 59, 59, 999);
  }

  const orders = await getSalesHistory({
    customerEmail:
      typeof req.query.customerEmail === "string" ? req.query.customerEmail : undefined,
    itemName: typeof req.query.itemName === "string" ? req.query.itemName : undefined,
    dateFrom,
    dateTo
  });

  res.json({ orders });
}

export async function inventory(req: Request, res: Response) {
  const items = await getInventory();
  res.json({ items });
}

export async function createInventory(req: Request, res: Response) {
  const item = await addInventoryItem(req.body);
  res.status(201).json({ item });
}

export async function updateInventory(req: Request, res: Response) {
  const item = await editInventoryItem(String(req.params.itemId), req.body);
  res.json({ item });
}

export async function deleteInventory(req: Request, res: Response) {
  await removeInventoryItem(String(req.params.itemId));
  res.status(204).send();
}

export async function users(req: Request, res: Response) {
  const users = await getUserAccounts();
  res.json({ users });
}

export async function updateUser(req: Request, res: Response) {
  const user = await editUserAccount(String(req.params.userId), req.body);
  res.json({ user });
}
