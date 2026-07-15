import { z } from "zod";

// Template is a fixed enum, NOT a filename or path the caller supplies. This
// is the whole point of the secure design: "which template" is a choice from a
// server-defined allowlist, so there is no path-traversal / arbitrary-file
// surface the way `template=../../etc/passwd` would create.
export const statementTemplateSchema = z.enum(["standard", "detailed"]);

export const generateStatementSchema = z
  .object({
    clientId: z.uuid("clientId must be a valid id"),
    from: z.coerce.date(),
    to: z.coerce.date(),
    template: statementTemplateSchema.optional().default("standard"),
    includePaid: z.boolean().optional().default(true),
    // Free-text note printed on the statement. Treated purely as data by the
    // PDF renderer (drawn as a text string, never interpreted as a template
    // or format directive), so it carries no injection surface.
    introText: z.string().trim().max(2000).optional(),
  })
  .refine((data) => data.to >= data.from, {
    message: "The end date must be on or after the start date",
    path: ["to"],
  });
