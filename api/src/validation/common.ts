import { z } from "zod";

// Accepts undefined or "" as "no value", otherwise must be a valid email —
// shared by any schema with an optional email field (Client, Company).
export const optionalEmail = z
  .string()
  .trim()
  .max(320)
  .optional()
  .refine((v) => !v || z.email().safeParse(v).success, { message: "Enter a valid email address" })
  .transform((v) => (v ? v : undefined));

export const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .refine((v) => !v || z.url().safeParse(v).success, { message: "Enter a valid URL" })
  .transform((v) => (v ? v : undefined));
