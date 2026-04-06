import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { AppError } from "../utils/app-error.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.user) {
    return next(new AppError(401, "Authentication required"));
  }

  return next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.user) {
    return next(new AppError(401, "Authentication required"));
  }

  if (req.session.user.role !== UserRole.ADMIN) {
    return next(new AppError(403, "Admin access required"));
  }

  return next();
}
