import { ChatPanel } from "@/components/assistant/chat-panel";
import { PageHeader } from "@/components/shared/page-header";

export default function AssistantPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Assistant" description="Ask questions about your invoices, clients, and expenses." />
      <ChatPanel />
    </div>
  );
}
