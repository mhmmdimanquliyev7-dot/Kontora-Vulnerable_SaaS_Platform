import type { NextFunction, Request, Response } from "express";

import { AppError } from "@/lib/errors.js";

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.code, message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: "InternalServerError",
    message: "Something went wrong. Please try again later.",
  });
}
