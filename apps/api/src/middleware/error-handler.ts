import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    message: "Route not found"
  });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Validation error",
      issues: error.flatten()
    });
  }

  console.error(error);

  return res.status(500).json({
    message: "Unexpected server error"
  });
}
