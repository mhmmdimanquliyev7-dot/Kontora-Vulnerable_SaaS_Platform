"use client";

import { AlertTriangle, DollarSign, FileText, ShieldAlert, Wallet } from "lucide-react";

import { InvoiceStatusChart } from "@/components/dashboard/invoice-status-chart";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { RecentBlogSearches } from "@/components/dashboard/recent-blog-searches";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/use-auth";
import { useDashboardSummary } from "@/hooks/use-dashboard";
import { useInvoices } from "@/hooks/use-invoices";
import { ApiError } from "@/lib/api/client";
import { formatMoney } from "@/lib/format";

export default function DashboardPage() {
  const { data: me } = useMe();
  const isOwner = me?.role === "OWNER";
  const summary = useDashboardSummary();
  const invoices = useInvoices();

  if (summary.isError) {
    const forbidden = summary.error instanceof ApiError && summary.error.status === 403;
    return (
      <EmptyState
        icon={ShieldAlert}
        title={forbidden ? "You don't have access to the dashboard" : "Couldn't load the dashboard"}
        description={
          forbidden
            ? "Dashboard summaries are only visible to owners and accountants."
            : "Something went wrong. Try refreshing the page."
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="A snapshot of how the business is doing." />

      {summary.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total revenue"
            value={formatMoney(summary.data.totalRevenue)}
            icon={DollarSign}
          />
          <StatCard
            label="Outstanding"
            value={formatMoney(summary.data.outstandingAmount)}
            icon={Wallet}
            accentClassName="bg-status-warning/15 text-amber-700 dark:text-status-warning"
          />
          <StatCard
            label="Overdue invoices"
            value={String(summary.data.overdueCount)}
            icon={AlertTriangle}
            accentClassName="bg-status-critical/10 text-status-critical"
          />
          <StatCard
            label="Total expenses"
            value={formatMoney(summary.data.totalExpenses)}
            icon={FileText}
            accentClassName="bg-status-neutral/10 text-status-neutral"
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {invoices.isPending ? (
            <Skeleton className="h-80" />
          ) : (
            <InvoiceStatusChart invoices={invoices.data ?? []} />
          )}
        </div>
        <div className="lg:col-span-2">
          {summary.isPending ? (
            <Skeleton className="h-80" />
          ) : (
            <RecentActivityList entries={summary.data.recentActivity} />
          )}
        </div>
      </div>

      {/* Chapter 15 — blind-XSS sink panel; OWNER-only. */}
      {isOwner && <RecentBlogSearches />}
    </div>
  );
}
