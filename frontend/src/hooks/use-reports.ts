import { useQuery } from "@tanstack/react-query";

import * as reportsApi from "@/lib/api/reports";

export function useNamedReports() {
  return useQuery({ queryKey: ["reports", "named", "list"], queryFn: reportsApi.listNamedReports });
}

export function useNamedReport(name: string | undefined) {
  return useQuery({
    queryKey: ["reports", "named", "run", name],
    queryFn: () => reportsApi.runNamedReport(name!),
    enabled: !!name,
  });
}
