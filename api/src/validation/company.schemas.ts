import { z } from "zod";

import { optionalUrl } from "@/validation/common.js";

export const updateCompanySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200).optional(),
  website: optionalUrl,
  address: z.string().trim().max(500).optional(),
});
