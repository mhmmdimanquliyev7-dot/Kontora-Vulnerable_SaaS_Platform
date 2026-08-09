import type { Request, Response } from "express";

import * as blogSearchService from "@/services/blogSearch.service.js";

// Chapter 15 — XSS lab (INTENTIONAL, training only).

// Public, no auth: searches published posts and logs the raw term.
export async function search(req: Request, res: Response): Promise<void> {
  const term = (req.query.q as string) ?? "";
  const posts = await blogSearchService.searchPublishedPosts(term);
  res.status(200).json({ posts });
}

// OWNER-only (guarded on the route): recent public search terms, for the admin
// "recent searches" panel that renders each term as raw HTML (blind-XSS sink).
export async function listSearchLogs(_req: Request, res: Response): Promise<void> {
  const searches = await blogSearchService.listRecentSearchTerms();
  res.status(200).json({ searches });
}
