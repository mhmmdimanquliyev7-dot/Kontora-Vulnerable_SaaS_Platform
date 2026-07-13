import { History } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { humanizeAction } from "@/lib/activity-label";
import { formatDateTime } from "@/lib/format";
import type { ActivityEntry } from "@/lib/api/types";

export function RecentActivityList({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState icon={History} title="No activity yet" className="border-none py-8" />
        ) : (
          <ul className="space-y-4">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{humanizeAction(entry.action)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.user?.name ?? "System"}
                  </p>
                </div>
                <time className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                  {formatDateTime(entry.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
