import { apiFetch } from "@/lib/api/client";

export async function sendMessage(message: string): Promise<string> {
  const res = await apiFetch<{ reply: string }>("/api/assistant/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
  return res.reply;
}
