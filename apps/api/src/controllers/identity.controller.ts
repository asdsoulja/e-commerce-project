import { Request, Response } from "express";
import { mergeGuestCartIntoUserCart } from "../services/cart.service.js";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  updateCurrentUserProfile
} from "../services/identity.service.js";
import { AppError } from "../utils/app-error.js";

export async function register(req: Request, res: Response) {
  const user = await registerUser(req.body);
  const cart = await mergeGuestCartIntoUserCart(user.id, req.session.guestCart);

  req.session.user = {
    id: user.id,
    email: user.email,
    role: user.role
  };
  delete req.session.guestCart;

  res.status(201).json({ user, cart });
}

export async function login(req: Request, res: Response) {
  const user = await loginUser(req.body);
  const cart = await mergeGuestCartIntoUserCart(user.id, req.session.guestCart);

  req.session.user = {
    id: user.id,
    email: user.email,
    role: user.role
  };
  delete req.session.guestCart;

  res.json({ user, cart });
}

export async function logout(req: Request, res: Response) {
  req.session.destroy((err) => {
    if (err) {
      throw new AppError(500, "Failed to log out");
    }

    res.clearCookie("connect.sid");
    res.status(204).send();
  });
}

export async function me(req: Request, res: Response) {
  const sessionUser = req.session.user;
  if (!sessionUser) {
    throw new AppError(401, "Authentication required");
  }

  const user = await getCurrentUser(sessionUser.id);
  res.json({ user });
}

export async function updateMe(req: Request, res: Response) {
  const sessionUser = req.session.user;
  if (!sessionUser) {
    throw new AppError(401, "Authentication required");
  }

  const user = await updateCurrentUserProfile(sessionUser.id, req.body);
  res.json({ user });
}
