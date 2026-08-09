import { z } from "zod";

// Chapter 15 — XSS lab (INTENTIONAL, training only). Public blog-comment input.
// Deliberately NO sanitization/escaping and no format constraints beyond
// "present + length-bounded": the body is stored verbatim and later rendered as
// raw HTML (stored-XSS sink). Length caps only stop unbounded storage.
export const createBlogCommentSchema = z.object({
  authorName: z.string().trim().min(1, "Name is required").max(200),
  website: z.string().trim().max(500).optional(),
  body: z.string().min(1, "Comment is required").max(10_000),
});
