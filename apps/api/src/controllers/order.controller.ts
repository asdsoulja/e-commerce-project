import { Request, Response } from "express";
import { checkout, getPurchaseHistory } from "../services/ordering.service.js";

export async function checkoutOrder(req: Request, res: Response) {
  const result = await checkout(req.session.user!.id, req.body);
  res.json(result);
}

export async function myOrders(req: Request, res: Response) {
  const orders = await getPurchaseHistory(req.session.user!.id);
  res.json({ orders });
}
