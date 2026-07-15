import { z } from "zod";

// A report identifier. Constrained to a conservative slug shape here as the
// first of two gates — no slashes, dots, or whitespace can appear, so the
// value can never express a path segment like "../" before it's even sent to
// report-service (which applies its own allowlist + realpath check as the
// second gate). This is the secure counterpart to a "load the file the user
// named" feature: the name is validated to a safe alphabet, never trusted as
// a path.
export const reportNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/, "Invalid report name.");
