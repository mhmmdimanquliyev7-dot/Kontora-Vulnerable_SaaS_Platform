import type { Request, Response } from "express";

import { ValidationError } from "@/lib/errors.js";
import { requireParam } from "@/lib/params.js";
import * as blogService from "@/services/blog.service.js";
import { BlogPostStatus } from "@kontora/db";

// ---- Public (no auth) -----------------------------------------------------

export async function listPublic(_req: Request, res: Response): Promise<void> {
  const posts = await blogService.listPublishedPosts();
  res.status(200).json({ posts });
}

export async function getPublic(req: Request, res: Response): Promise<void> {
  const post = await blogService.getPublishedPostBySlug(requireParam(req, "slug"));
  res.status(200).json({ post });
}

// ---- Admin (auth + OWNER/ACCOUNTANT) --------------------------------------

export async function listAdmin(req: Request, res: Response): Promise<void> {
  const posts = await blogService.listCompanyPosts(req.auth!.companyId);
  res.status(200).json({ posts });
}

export async function getAdmin(req: Request, res: Response): Promise<void> {
  const post = await blogService.getCompanyPost(req.auth!.companyId, requireParam(req, "id"));
  res.status(200).json({ post });
}

export async function create(req: Request, res: Response): Promise<void> {
  const post = await blogService.createPost(req.auth!.companyId, req.auth!.userId, {
    ...req.body,
    status: req.body.status as BlogPostStatus,
  });
  res.status(201).json({ post });
}

export async function update(req: Request, res: Response): Promise<void> {
  const post = await blogService.updatePost(
    req.auth!.companyId,
    req.auth!.userId,
    requireParam(req, "id"),
    req.body,
  );
  res.status(200).json({ post });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await blogService.deletePost(req.auth!.companyId, req.auth!.userId, requireParam(req, "id"));
  res.status(204).send();
}

export async function uploadCover(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new ValidationError('An image upload (field "image") is required.');
  }
  const post = await blogService.setCoverImage(
    req.auth!.companyId,
    req.auth!.userId,
    requireParam(req, "id"),
    req.file.buffer,
  );
  res.status(200).json({ post });
}
