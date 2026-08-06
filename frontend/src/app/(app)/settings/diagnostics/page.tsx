"use client";

import { Lock } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useMe } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import * as diagnostics from "@/lib/api/diagnostics";

function DiagnosticSection({
  title,
  description,
  placeholder,
  buttonLabel,
  run,
}: {
  title: string;
  description: string;
  placeholder: string;
  buttonLabel: string;
  run: (value: string) => Promise<unknown>;
}) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function onRun() {
    setRunning(true);
    setResult(null);
    try {
      const data = await run(value);
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setResult(
        err instanceof ApiError ? `Error ${err.status}: ${err.message}` : "Request failed",
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
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
        {result !== null && (
          <pre className="max-h-72 overflow-auto rounded-md border bg-muted p-3 text-xs whitespace-pre-wrap">
            {result}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

export default function DiagnosticsSettingsPage() {
  const { data: me } = useMe();
  const isOwner = me?.role === "OWNER";

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="System Diagnostics"
          description="Low-level network checks run from the application server."
        />
        <EmptyState
          icon={Lock}
          title="Owner access required"
          description="Only the workspace owner can run system diagnostics."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Diagnostics"
        description="Run low-level network checks against a host or URL from the application server."
      />

      <DiagnosticSection
        title="Ping"
        description="Send 4 ICMP echo requests to a host and show the raw output."
        placeholder="example.com"
        buttonLabel="Ping"
        run={(v) => diagnostics.ping(v)}
      />

      <DiagnosticSection
        title="Connectivity Test"
        description="Check whether a URL responds with a 2xx status. Returns only reachable / unreachable."
        placeholder="https://example.com"
        buttonLabel="Test"
        run={(v) => diagnostics.connectivity(v)}
      />

      <DiagnosticSection
        title="Ping (strict)"
        description="Same as Ping, but rejects hosts containing shell metacharacters."
        placeholder="example.com"
        buttonLabel="Ping"
        run={(v) => diagnostics.pingStrict(v)}
      />

      <DiagnosticSection
        title="Remote Fetch"
        description="Fetch a remote URL from the server with curl and show the response body."
        placeholder="https://example.com"
        buttonLabel="Fetch"
        run={(v) => diagnostics.fetchRemote(v)}
      />
    </div>
  );
}
