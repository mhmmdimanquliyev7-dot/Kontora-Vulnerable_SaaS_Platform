"use client";

import { Bot, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSendMessage } from "@/hooks/use-assistant";
import { useMe } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/api/types";

const STARTER_PROMPTS = [
  "How much is outstanding?",
  "Which clients owe me money?",
  "Any overdue invoices?",
  "What's my total revenue?",
];

function randomDelayMs(): number {
  // Purely a UX pacing detail — the reply is already computed by the time
  // this runs; this just avoids it appearing so instantly that the "typing"
  // indicator never has a chance to read as genuine.
  return 500 + Math.random() * 900;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex items-start gap-2.5", isUser && "flex-row-reverse")}>
      <Avatar className="size-7 shrink-0">
        <AvatarFallback
          className={cn(
            "text-xs",
            isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          )}
        >
          {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-muted text-foreground",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

export function ChatPanel() {
  const { data: me } = useMe();
  const sendMessage = useSendMessage();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sendMessage.isPending || typing) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setTyping(true);

    try {
      const [reply] = await Promise.all([sendMessage.mutateAsync(trimmed), sleep(randomDelayMs())]);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: reply }]);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong");
    } finally {
      setTyping(false);
    }
  }

  return (
    <Card className="flex h-[calc(100vh-10rem)] flex-col overflow-hidden p-0">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Bot className="size-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Ask me about your invoices, clients, or expenses</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {me?.role === "MEMBER"
                  ? "I can answer questions about invoices and clients."
                  : "I can answer questions about invoices, clients, and expenses."}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submit(prompt)}
                  className="rounded-full border px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}

        {typing && (
          <div className="flex items-start gap-2.5">
            <Avatar className="size-7 shrink-0">
              <AvatarFallback className="bg-muted text-foreground">
                <Bot className="size-3.5" />
              </AvatarFallback>
            </Avatar>
            <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="flex items-center gap-2 border-t p-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your data…"
          disabled={sendMessage.isPending || typing}
          autoComplete="off"
        />
        <Button type="submit" size="icon" disabled={!input.trim() || sendMessage.isPending || typing}>
          <Send className="size-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </Card>
  );
}
