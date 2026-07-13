import { z } from "zod";

import { optionalEmail } from "@/validation/common.js";

export const createClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: optionalEmail,
  phone: z.string().trim().max(50).optional(),
  billingAddress: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const listClientsQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
});
