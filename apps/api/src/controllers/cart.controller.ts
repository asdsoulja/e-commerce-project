import { Request, Response } from "express";
import {
  addItemToCart,
  deleteCartItem,
  getCart,
  updateCartItem
} from "../services/cart.service.js";

export async function getCurrentCart(req: Request, res: Response) {
  const cart = await getCart(req.session.user!.id);
  res.json({ cart });
}

export async function addToCart(req: Request, res: Response) {
  const cart = await addItemToCart(req.session.user!.id, req.body.itemId, req.body.quantity);
  res.status(201).json({ cart });
}

export async function patchCartItem(req: Request, res: Response) {
  const itemId = String(req.params.itemId);
  const cart = await updateCartItem(
    req.session.user!.id,
    itemId,
    req.body.quantity
  );

  res.json({ cart });
}

export async function removeItem(req: Request, res: Response) {
  const cart = await deleteCartItem(req.session.user!.id, String(req.params.itemId));
  res.json({ cart });
}
