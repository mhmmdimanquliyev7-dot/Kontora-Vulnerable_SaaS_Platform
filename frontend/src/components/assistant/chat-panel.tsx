"use client";

import { Bot, RefreshCw, Send, User, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAssistantSocket } from "@/hooks/use-assistant-socket";
import { useMe } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/api/types";

const STARTER_PROMPTS = [
  "How much is outstanding?",
  "Which clients owe me money?",
  "Any overdue invoices?",
  "What's my total revenue?",
];

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
            isUser ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
          )}
        >
          {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap shadow-xs",
          isUser
            ? "rounded-tr-sm bg-gradient-to-br from-primary to-violet-600 text-primary-foreground dark:to-violet-500"
            : "rounded-tl-sm border bg-card text-card-foreground",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

export function ChatPanel() {
  const { data: me } = useMe();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleReply = useCallback((content: string) => {
    setTyping(false);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content }]);
  }, []);

  const handleError = useCallback((message: string) => {
    setTyping(false);
    toast.error(message);
  }, []);

  const handleTyping = useCallback(() => setTyping(true), []);

  const { status, send, reconnect } = useAssistantSocket({
    onReply: handleReply,
    onError: handleError,
    onTyping: handleTyping,
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || typing || status !== "open") return;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }]);
    setInput("");

    // The server echoes a "typing" event and then the reply; if the socket
    // dropped between render and send, surface it rather than silently losing
    // the message.
    if (!send(trimmed)) {
      toast.error("Not connected — try reconnecting.");
    }
  }

  return (
    <Card className="flex h-[calc(100vh-10rem)] flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {status === "open" ? (
            <>
              <Wifi className="size-3.5 text-status-good" />
              Connected — live
            </>
          ) : status === "connecting" ? (
            <>
              <Wifi className="size-3.5 animate-pulse" />
              Connecting…
            </>
          ) : (
            <>
              <WifiOff className="size-3.5 text-status-critical" />
              Disconnected
            </>
          )}
        </span>
        {status === "closed" && (
          <Button variant="ghost" size="sm" onClick={reconnect}>
            <RefreshCw className="size-3.5" />
            Reconnect
          </Button>
        )}
      </div>

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
                  className="rounded-full border bg-card px-3 py-1.5 text-xs shadow-xs transition-colors hover:border-primary/30 hover:bg-accent hover:text-accent-foreground"
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
              <AvatarFallback className="bg-primary/10 text-primary">
                <Bot className="size-3.5" />
              </AvatarFallback>
            </Avatar>
            <div className="rounded-2xl rounded-tl-sm border bg-card px-3.5 py-2 shadow-xs">
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
          placeholder={
            status === "open" ? "Ask a question about your data…" : "Connecting to the assistant…"
          }
          disabled={typing || status !== "open"}
          maxLength={1000}
          autoComplete="off"
        />
        <Button type="submit" size="icon" disabled={!input.trim() || typing || status !== "open"}>
          <Send className="size-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </Card>
  );
}
