import { Router } from "express";

import * as blogController from "@/controllers/blog.controller.js";
import * as blogCommentController from "@/controllers/blogComment.controller.js";
import * as blogCoverController from "@/controllers/blogCover.controller.js";
import * as blogImportController from "@/controllers/blogImport.controller.js";
import * as blogLinkPreviewController from "@/controllers/blogLinkPreview.controller.js";
import * as blogSearchController from "@/controllers/blogSearch.controller.js";
import { requireAuth } from "@/middleware/requireAuth.js";
import { requireRole } from "@/middleware/requireRole.js";
import { uploadCoverRaw } from "@/middleware/upload.js";
import { validateBody } from "@/middleware/validate.js";
import { Role } from "@kontora/db";
import { createBlogPostSchema, updateBlogPostSchema } from "@/validation/blog.schemas.js";
import { createBlogCommentSchema } from "@/validation/blogComment.schemas.js";
import { importFromUrlSchema } from "@/validation/blogImport.schemas.js";
import { linkPreviewSchema } from "@/validation/blogLinkPreview.schemas.js";

// This router is mounted WITHOUT a global requireAuth (unlike the other
// feature routers) because the public read routes must be reachable by
// logged-out visitors. Every admin route therefore carries requireAuth +
// requireRole explicitly. Managing blog content is an OWNER/ACCOUNTANT
// concern — the same "financially/publicly accountable" bar as reports.
export const blogRouter = Router();

const canManage = [requireAuth, requireRole(Role.OWNER, Role.ACCOUNTANT)];

// Admin routes are registered before the public "/:slug" route so that
// "/admin" is never parsed as a post slug.
blogRouter.get("/admin/posts", ...canManage, blogController.listAdmin);
blogRouter.post(
  "/admin/posts",
  ...canManage,
  validateBody(createBlogPostSchema),
  blogController.create,
);
blogRouter.get("/admin/posts/:id", ...canManage, blogController.getAdmin);
blogRouter.patch(
  "/admin/posts/:id",
  ...canManage,
  validateBody(updateBlogPostSchema),
  blogController.update,
);
blogRouter.delete("/admin/posts/:id", ...canManage, blogController.remove);
// Chapter 16 — unrestricted file upload -> RCE lab. Cover upload now runs the
// four bypassable filters and stores the original file verbatim (see
// blogCover.service.ts) instead of the sharp re-encode.
blogRouter.post(
  "/admin/posts/:id/cover",
  ...canManage,
  uploadCoverRaw,
  blogCoverController.uploadCover,
);

// Chapter 17 — SSRF lab. "Import from URL": prefill the post editor from an
// external article. Registered before "/admin/posts/:id" so "import" is
// never parsed as a post id.
blogRouter.post(
  "/admin/posts/import",
  ...canManage,
  validateBody(importFromUrlSchema),
  blogImportController.importFromUrl,
);

// Chapter 15 — XSS lab. OWNER-only "recent searches" panel data (blind-XSS
// sink). Registered in the admin block so "/admin/..." is never parsed as a
// post slug.
blogRouter.get(
  "/admin/search-logs",
  requireAuth,
  requireRole(Role.OWNER),
  blogSearchController.listSearchLogs,
);

// Public — no auth. Only PUBLISHED posts are ever exposed here.
blogRouter.get("/posts", blogController.listPublic);

// Chapter 15 — XSS lab. Public blog search: logs the raw term (blind-XSS
// source). Registered before "/posts/:slug" so it isn't parsed as a slug.
blogRouter.get("/search", blogSearchController.search);

blogRouter.get("/posts/:slug", blogController.getPublic);

// Chapter 15 — XSS lab. Public blog-post comments (stored-XSS sink). No auth.
blogRouter.get("/posts/:slug/comments", blogCommentController.list);
blogRouter.post(
  "/posts/:slug/comments",
  validateBody(createBlogCommentSchema),
  blogCommentController.create,
);

// Chapter 17 — SSRF lab. Server-side "link preview" for a comment's Website
// field. Not slug-scoped — it fetches whatever URL it's given, same as the
// third-party link-unfurling services (Slack, Discord, ...) this imitates.
blogRouter.post(
  "/comments/link-preview",
  validateBody(linkPreviewSchema),
  blogLinkPreviewController.preview,
);
