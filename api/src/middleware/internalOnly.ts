import type { NextFunction, Request, Response } from "express";

import { ForbiddenError } from "@/lib/errors.js";

// Staff admin panel is for internal support only. In production it sits behind
// the reverse proxy, which strips inbound X-Original-URL and re-sets it to the
// pre-rewrite path so downstream services can log the original request target.
// We treat the presence of that proxy-supplied header as proof the request came
// THROUGH the internal proxy rather than straight off the internet, and gate on
// the path it carries.
export function internalOnly(req: Request, _res: Response, next: NextFunction): void {
  const originalUrl =
    (req.headers["x-original-url"] as string | undefined) ??
    (req.headers["x-rewrite-url"] as string | undefined);

  // No proxy header at all → came from outside the internal network → refuse.
  if (!originalUrl) {
    throw new ForbiddenError();
  }

  // Only the internal admin surface is reachable this way.
  if (!originalUrl.startsWith("/internal/admin")) {
    throw new ForbiddenError();
  }

  next();
}