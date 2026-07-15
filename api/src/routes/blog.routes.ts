import { Router } from "express";

import * as blogController from "@/controllers/blog.controller.js";
import { requireAuth } from "@/middleware/requireAuth.js";
import { requireRole } from "@/middleware/requireRole.js";
import { uploadImage } from "@/middleware/upload.js";
import { validateBody } from "@/middleware/validate.js";
import { Role } from "@kontora/db";
import { createBlogPostSchema, updateBlogPostSchema } from "@/validation/blog.schemas.js";

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
blogRouter.post("/admin/posts/:id/cover", ...canManage, uploadImage, blogController.uploadCover);

// Public — no auth. Only PUBLISHED posts are ever exposed here.
blogRouter.get("/posts", blogController.listPublic);
blogRouter.get("/posts/:slug", blogController.getPublic);
