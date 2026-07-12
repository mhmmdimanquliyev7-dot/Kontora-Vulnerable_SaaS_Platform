import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

import { ValidationError } from "@/lib/errors.js";

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join(", ");
      throw new ValidationError(message);
    }
    req.body = result.data;
    next();
  };
}
