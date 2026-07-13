"use client";

import { History } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useActivity } from "@/hooks/use-activity";
import { humanizeAction } from "@/lib/activity-label";
import { formatDateTime } from "@/lib/format";

const PAGE_SIZE = 25;

export default function ActivityPage() {
  const [offset, setOffset] = useState(0);
  const activity = useActivity({ limit: PAGE_SIZE, offset });

  const total = activity.data?.total ?? 0;
  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity log"
        description="A record of what's changed in this workspace."
      />

      {activity.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : activity.data && activity.data.entries.length > 0 ? (
        <>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.data.entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{humanizeAction(entry.action)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.user?.name ?? "System"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{entry.entityType}</TableCell>
                    <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!hasPrev}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNext}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState icon={History} title="No activity yet" />
      )}
    </div>
  );
}
