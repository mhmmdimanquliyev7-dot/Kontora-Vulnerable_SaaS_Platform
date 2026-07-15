import { z } from "zod";

export const blogPostStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);

export const createBlogPostSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  // Markdown source. Stored verbatim; rendered to sanitized HTML only on the
  // public read path (see api/src/lib/markdown.ts). The cap is generous but
  // bounded so a single post can't be used to store unbounded data.
  body: z.string().min(1, "Body is required").max(50_000),
  excerpt: z.string().trim().max(500).optional(),
  status: blogPostStatusSchema.optional().default("DRAFT"),
});

export const updateBlogPostSchema = createBlogPostSchema.partial();

export const listBlogPostsQuerySchema = z.object({
  status: blogPostStatusSchema.optional(),
});
