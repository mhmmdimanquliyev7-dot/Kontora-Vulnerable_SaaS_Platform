"use client";

import { FileDown, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { useClients } from "@/hooks/use-clients";
import { useMe } from "@/hooks/use-auth";
import { generateStatement } from "@/lib/api/documents";
import { ApiError } from "@/lib/api/client";
import type { StatementTemplate } from "@/lib/api/types";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function DocumentsPage() {
  const { data: me } = useMe();
  const canGenerate = me?.role === "OWNER" || me?.role === "ACCOUNTANT";
  const clients = useClients();

  const [clientId, setClientId] = useState("");
  const [from, setFrom] = useState(isoDaysAgo(90));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [template, setTemplate] = useState<StatementTemplate>("standard");
  const [includePaid, setIncludePaid] = useState(true);
  const [introText, setIntroText] = useState("");
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (!clientId) {
      toast.error("Select a client first.");
      return;
    }
    setGenerating(true);
    try {
      const blob = await generateStatement({
        clientId,
        from,
        to,
        template,
        includePaid,
        introText: introText.trim() || undefined,
      });
      // Open the generated PDF in a new tab.
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success("Statement generated");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  if (!canGenerate) {
    return (
      <div className="space-y-6">
        <PageHeader title="Documents" description="Generate account statements for your clients." />
        <EmptyState
          icon={Lock}
          title="Owners and accountants only"
          description="Statement generation is limited to workspace owners and accountants."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Generate a formatted account statement for a client over a date range."
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Client statement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Client" htmlFor="client">
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="client" className="w-full">
                <SelectValue placeholder="Select a client…" />
              </SelectTrigger>
              <SelectContent>
                {clients.data?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="From" htmlFor="from">
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </FormField>
            <FormField label="To" htmlFor="to">
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </FormField>
          </div>

          <FormField
            label="Template"
            htmlFor="template"
            hint="Detailed includes each invoice's notes; standard is a summary."
          >
            <Select value={template} onValueChange={(v) => setTemplate(v as StatementTemplate)}>
              <SelectTrigger id="template" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Intro note (optional)"
            htmlFor="introText"
            hint="Printed at the top of the statement."
          >
            <Textarea
              id="introText"
              rows={3}
              maxLength={2000}
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              placeholder="e.g. Thank you for your continued business."
            />
          </FormField>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={includePaid}
              onCheckedChange={(v) => setIncludePaid(v === true)}
            />
            Include paid invoices
          </label>

          <div className="flex justify-end">
            <Button onClick={handleGenerate} disabled={generating || !clientId}>
              {generating ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
              Generate statement
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
