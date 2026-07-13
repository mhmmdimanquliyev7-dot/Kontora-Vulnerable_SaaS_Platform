import { useQuery } from "@tanstack/react-query";

import { listActivity } from "@/lib/api/activity";

export function useActivity(params: { limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: ["activity", params.limit ?? 50, params.offset ?? 0],
    queryFn: () => listActivity(params),
  });
}
