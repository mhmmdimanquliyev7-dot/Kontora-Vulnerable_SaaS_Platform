"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSearchLogs } from "@/lib/api/blog-search";

function formatWhen(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Chapter 15 — XSS lab (INTENTIONAL, training only). Blind-XSS SINK: each logged
// blog search term is injected as raw HTML via dangerouslySetInnerHTML. A
// payload typed into the public blog search lies dormant until an owner opens
// this panel, then executes in the admin's browser. OWNER-only: the data
// endpoint is guarded by requireRole(OWNER), and the widget is only rendered for
// owners on the dashboard.
export function RecentBlogSearches() {
  const searches = useQuery({
    queryKey: ["blog", "admin", "search-logs"],
    queryFn: getSearchLogs,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="size-4 text-muted-foreground" />
          Recent blog searches
        </CardTitle>
        <CardDescription>What visitors are searching for on your public blog.</CardDescription>
      </CardHeader>
      <CardContent>
        {searches.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : searches.data && searches.data.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {searches.data.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3">
                {/* Chapter 15 — blind-XSS sink: term rendered as raw HTML. */}
                <span className="truncate" dangerouslySetInnerHTML={{ __html: s.term }} />
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatWhen(s.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No searches yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
