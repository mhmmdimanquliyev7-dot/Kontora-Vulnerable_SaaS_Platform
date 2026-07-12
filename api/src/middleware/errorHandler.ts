import type { NextFunction, Request, Response } from "express";

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  console.error(err);
  res.status(500).json({
    error: "InternalServerError",
    message: "Something went wrong. Please try again later.",
  });
}
