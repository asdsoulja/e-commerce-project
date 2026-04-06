import { Request, Response } from "express";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  updateCurrentUserProfile
} from "../services/identity.service.js";
import { AppError } from "../utils/app-error.js";

export async function register(req: Request, res: Response) {
  const user = await registerUser(req.body);

  req.session.user = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  res.status(201).json({ user });
}

export async function login(req: Request, res: Response) {
  const user = await loginUser(req.body);

  req.session.user = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  res.json({ user });
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
