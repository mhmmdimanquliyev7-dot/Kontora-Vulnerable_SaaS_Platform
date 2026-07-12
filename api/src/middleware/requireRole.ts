import type { NextFunction, Request, Response } from "express";

import { ForbiddenError, UnauthorizedError } from "@/lib/errors.js";
import type { Role } from "@kontora/db";

// Must run after requireAuth. Role is scoped to the caller's active
// membership (req.auth.role), never re-derived from the request.
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      throw new UnauthorizedError();
    }
    if (!allowedRoles.includes(req.auth.role)) {
      throw new ForbiddenError();
    }
    next();
  };
}
