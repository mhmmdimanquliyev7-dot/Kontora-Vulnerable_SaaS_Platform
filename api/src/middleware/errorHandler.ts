import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";

import { AppError } from "@/lib/errors.js";

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.code, message: err.message });
    return;
  }

  if (err instanceof MulterError) {
    res.status(400).json({ error: "ValidationError", message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: "InternalServerError",
    message: err.message,
    stack: err.stack,
  });
}
