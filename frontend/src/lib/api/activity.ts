import { apiFetch } from "@/lib/api/client";
import type { ActivityPage } from "@/lib/api/types";

export function listActivity(
  params: { limit?: number; offset?: number } = {},
): Promise<ActivityPage> {
  const search = new URLSearchParams();
  if (params.limit) search.set("limit", String(params.limit));
  if (params.offset) search.set("offset", String(params.offset));
  const qs = search.toString() ? `?${search.toString()}` : "";
  return apiFetch(`/api/activity${qs}`);
}
