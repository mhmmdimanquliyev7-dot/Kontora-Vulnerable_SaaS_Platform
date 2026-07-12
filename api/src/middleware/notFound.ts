import type { Request, Response } from "express";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: "NotFound",
    message: `No route matches ${req.method} ${req.originalUrl}`,
  });
}
