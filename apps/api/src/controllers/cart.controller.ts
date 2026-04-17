import { Request, Response } from "express";
import {
  addItemToCart,
  addItemToGuestCart,
  deleteCartItem,
  deleteGuestCartItem,
  getCart,
  getGuestCart,
  updateCartItem,
  updateGuestCartItem
} from "../services/cart.service.js";

function updateGuestCartSession(req: Request, entries: Array<{ itemId: string; quantity: number }>) {
  if (entries.length === 0) {
    delete req.session.guestCart;
    return;
  }

  req.session.guestCart = entries;
}

export async function getCurrentCart(req: Request, res: Response) {
  if (req.session.user) {
    const cart = await getCart(req.session.user.id);
    res.json({ cart });
    return;
  }

  const guestResult = await getGuestCart(req.session.guestCart);
  updateGuestCartSession(req, guestResult.guestCart);
  const cart = guestResult.cart;
  res.json({ cart });
}

export async function addToCart(req: Request, res: Response) {
  if (req.session.user) {
    const cart = await addItemToCart(req.session.user.id, req.body.itemId, req.body.quantity);
    res.status(201).json({ cart });
    return;
  }

  const guestResult = await addItemToGuestCart(
    req.session.guestCart,
    req.body.itemId,
    req.body.quantity
  );
  updateGuestCartSession(req, guestResult.guestCart);
  const cart = guestResult.cart;
  res.status(201).json({ cart });
}

export async function patchCartItem(req: Request, res: Response) {
  const itemId = String(req.params.itemId);

  if (req.session.user) {
    const cart = await updateCartItem(
      req.session.user.id,
      itemId,
      req.body.quantity
    );
    res.json({ cart });
    return;
  }

  const guestResult = await updateGuestCartItem(req.session.guestCart, itemId, req.body.quantity);
  updateGuestCartSession(req, guestResult.guestCart);
  const cart = guestResult.cart;
  res.json({ cart });
}

export async function removeItem(req: Request, res: Response) {
  if (req.session.user) {
    const cart = await deleteCartItem(req.session.user.id, String(req.params.itemId));
    res.json({ cart });
    return;
  }

  const guestResult = await deleteGuestCartItem(req.session.guestCart, String(req.params.itemId));
  updateGuestCartSession(req, guestResult.guestCart);
  const cart = guestResult.cart;
  res.json({ cart });
}
