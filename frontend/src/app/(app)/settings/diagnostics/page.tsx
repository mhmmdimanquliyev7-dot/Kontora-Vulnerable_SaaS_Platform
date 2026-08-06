"use client";

import { Lock } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useMe } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import * as diagnostics from "@/lib/api/diagnostics";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Small shared bits
// ---------------------------------------------------------------------------

function useAutoLoad<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    load()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e instanceof ApiError ? e.message : "Couldn't load this data.");
      });
    return () => {
      active = false;
    };
  }, [load]);

  return { data, error };
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", ok ? "bg-status-good" : "bg-status-critical")}
    />
  );
}

function LoadingRows({ n }: { n: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ---------------------------------------------------------------------------
// Auto-loading, read-only "Health" cards
// ---------------------------------------------------------------------------

function ServiceHealthCard() {
  const { data, error } = useAutoLoad(diagnostics.getHealth);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Service Health</CardTitle>
        <CardDescription>
          {data ? `All systems · up ${formatUptime(data.uptimeSeconds)}` : "Live status of Kontora services."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : !data ? (
          <LoadingRows n={5} />
        ) : (
          <ul className="space-y-2 text-sm">
            {data.services.map((s) => (
              <li key={s.name} className="flex items-center justify-between">
                <span>{s.name}</span>
                <span className="flex items-center gap-1.5 text-muted-foreground capitalize">
                  <StatusDot ok={s.status === "operational"} />
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function IntegrationStatusCard() {
  const { data, error } = useAutoLoad(diagnostics.getIntegrations);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Integration Status</CardTitle>
        <CardDescription>Connected services and recent activity.</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : !data ? (
          <LoadingRows n={4} />
        ) : (
          <ul className="space-y-3 text-sm">
            {data.integrations.map((i) => (
              <li key={i.name} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <StatusDot ok={i.connected} />
                  {i.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {i.connected
                    ? i.lastSyncedAt
                      ? `Synced ${formatDateTime(i.lastSyncedAt)}`
                      : "Connected"
                    : "Not connected"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function UsageCard() {
  const { data, error } = useAutoLoad(diagnostics.getUsage);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Usage</CardTitle>
        <CardDescription>{data ? `${data.plan} plan · this month` : "This month's usage."}</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : !data ? (
          <LoadingRows n={3} />
        ) : (
          <div className="space-y-2 text-sm">
            <MetricRow label="Invoices" value={data.invoicesThisMonth.toLocaleString()} />
            <MetricRow label="API calls" value={data.apiCallsThisMonth.toLocaleString()} />
            <MetricRow label="Storage used" value={`${data.storageUsedMb} MB`} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Input-driven diagnostic panel (used by the network/delivery checks)
// ---------------------------------------------------------------------------

function DiagnosticSection<T>({
  title,
  description,
  placeholder,
  buttonLabel,
  run,
  render,
}: {
  title: string;
  description: string;
  placeholder: string;
  buttonLabel: string;
  run: (value: string) => Promise<T>;
  render: (data: T) => ReactNode;
}) {
  const [value, setValue] = useState("");
  const [node, setNode] = useState<ReactNode>(null);
  const [running, setRunning] = useState(false);

  async function onRun() {
    setRunning(true);
    setNode(null);
    try {
      setNode(render(await run(value)));
    } catch (err) {
      setNode(
        <p className="text-sm text-destructive">
          {err instanceof ApiError ? err.message : "Request failed."}
        </p>,
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void onRun();
            }}
          />
          <Button className="sm:w-32" onClick={() => void onRun()} disabled={running}>
            {running ? "Running…" : buttonLabel}
          </Button>
        </div>
        {node !== null && (
          <div className="rounded-md border bg-muted/50 p-3 text-sm">{node}</div>
        )}
      </CardContent>
    </Card>
  );
}

function OutputText({ text }: { text: string }) {
  return (
    <pre className="max-h-72 overflow-auto text-xs whitespace-pre-wrap">
      {text.trim() ? text : "No output."}
    </pre>
  );
}

function DnsRecordsView({ data }: { data: diagnostics.DnsRecordsResult }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium">MX records</p>
        {data.mx.length ? (
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            {[...data.mx]
              .sort((a, b) => a.priority - b.priority)
              .map((m) => (
                <li key={`${m.priority}-${m.exchange}`}>
                  <code>{m.exchange}</code> (priority {m.priority})
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No MX records found.</p>
        )}
      </div>
      <div>
        <p className="font-medium">SPF</p>
        {data.spf ? (
          <code className="break-all text-muted-foreground">{data.spf}</code>
        ) : (
          <p className="text-muted-foreground">No SPF record found.</p>
        )}
      </div>
      <div>
        <p className="font-medium">DMARC</p>
        {data.dmarc ? (
          <code className="break-all text-muted-foreground">{data.dmarc}</code>
        ) : (
          <p className="text-muted-foreground">No DMARC record found.</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DiagnosticsSettingsPage() {
  const { data: me } = useMe();
  const isOwner = me?.role === "OWNER";

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="System Diagnostics"
          description="Health, integrations, and network checks for your workspace."
        />
        <EmptyState
          icon={Lock}
          title="Owner access required"
          description="Only the workspace owner can view system diagnostics."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="System Diagnostics"
        description="Check the health of your workspace and verify that your network and email are configured correctly."
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Health</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ServiceHealthCard />
          <IntegrationStatusCard />
          <UsageCard />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Network &amp; Delivery</h2>
        <div className="space-y-4">
          <DiagnosticSection
            title="Server Reachability"
            description="Check that a host is reachable from Kontora's servers."
            placeholder="mail.yourdomain.com"
            buttonLabel="Check"
            run={(v) => diagnostics.ping(v)}
            render={(d) => <OutputText text={d.output} />}
          />

          <DiagnosticSection
            title="Webhook Endpoint Test"
            description="Verify a webhook URL returns a successful (2xx) response from our servers."
            placeholder="https://yourapp.com/webhooks/kontora"
            buttonLabel="Test"
            run={(v) => diagnostics.connectivity(v)}
            render={(d) => (
              <span className="flex items-center gap-2">
                <StatusDot ok={d.reachable} />
                {d.reachable
                  ? "Endpoint responded successfully (2xx)."
                  : "Endpoint did not return a successful response."}
              </span>
            )}
          />

          <DiagnosticSection
            title="Mail Host Check"
            description="Validate and reach your outbound mail host."
            placeholder="smtp.yourdomain.com"
            buttonLabel="Check"
            run={(v) => diagnostics.pingStrict(v)}
            render={(d) => <OutputText text={d.output} />}
          />

          <DiagnosticSection
            title="DNS & Email Records"
            description="Look up MX, SPF, and DMARC records for a domain."
            placeholder="yourdomain.com"
            buttonLabel="Look up"
            run={(v) => diagnostics.dnsRecords(v)}
            render={(d) => <DnsRecordsView data={d} />}
          />

          <DiagnosticSection
            title="Import from URL"
            description="Import a logo or template by fetching it from a URL."
            placeholder="https://yourdomain.com/logo.png"
            buttonLabel="Import"
            run={(v) => diagnostics.fetchRemote(v)}
            render={(d) => <OutputText text={d.output} />}
          />
        </div>
      </section>
    </div>
  );
}
