import type { Request } from "express";

import { ValidationError } from "@/lib/errors.js";

// Express 5's types allow a route param to be string | string[] (repeated
// segments). Every route in this codebase uses single named params, so this
// just narrows that back to string, and rejects the pathological case
// (e.g. "/clients/a/b" for a "/clients/:id" route producing an array).
export function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError(`Missing or invalid path parameter: ${name}`);
  }
  return value;
}
