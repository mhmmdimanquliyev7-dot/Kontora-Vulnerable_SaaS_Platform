import type { Request } from "express";

import { UnauthorizedError } from "@/lib/errors.js";
import type { Role } from "@kontora/db";

export interface GraphQLContext {
  auth: {
    userId: string;
    companyId: string;
    role: Role;
    sessionId: string;
  };
}

// req.auth is populated by requireAuth, which the /graphql route is mounted
// behind — so by the time this runs the caller is already authenticated and
// their tenant is fixed by the signed access token. The throw is a guard
// against someone later mounting this endpoint without that middleware; it
// should be unreachable in normal operation.
export function buildContext(req: Request): GraphQLContext {
  if (!req.auth) {
    throw new UnauthorizedError();
  }
  return { auth: req.auth };
}
