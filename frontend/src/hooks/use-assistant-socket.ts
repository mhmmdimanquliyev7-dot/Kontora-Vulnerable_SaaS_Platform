"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiUrl } from "@/lib/api/client";

export type SocketStatus = "connecting" | "open" | "closed";

interface ServerEvent {
  type: "ready" | "typing" | "reply" | "error";
  content?: string;
  message?: string;
}

function socketUrl(): string {
  // Derive the ws:// (or wss://) origin from the configured API origin rather
  // than hardcoding it, so this follows the API wherever it's deployed. The
  // handshake carries the session cookie automatically — the API and frontend
  // share a hostname, and cookie scoping ignores the port.
  const http = apiUrl("/ws/assistant");
  return http.replace(/^http/, "ws");
}

interface UseAssistantSocketOptions {
  onReply: (content: string) => void;
  onError: (message: string) => void;
  onTyping: () => void;
}

// Thin wrapper over a single WebSocket to the assistant. Reconnection is
// deliberately manual (a button in the UI) rather than an automatic backoff
// loop: if the socket closed because the session expired or the role isn't
// allowed, retrying forever would just hammer a handshake that can't succeed.
export function useAssistantSocket({ onReply, onError, onTyping }: UseAssistantSocketOptions) {
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Keep the latest callbacks in a ref so reconnecting isn't triggered by a
  // parent re-render handing us new function identities. Written in an effect,
  // not during render — a ref mutation during render is not safe under
  // concurrent rendering.
  const handlers = useRef({ onReply, onError, onTyping });
  useEffect(() => {
    handlers.current = { onReply, onError, onTyping };
  }, [onReply, onError, onTyping]);

  useEffect(() => {
    let cancelled = false;
    const ws = new WebSocket(socketUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      if (!cancelled) setStatus("open");
    };

    ws.onmessage = (event) => {
      let data: ServerEvent;
      try {
        data = JSON.parse(String(event.data)) as ServerEvent;
      } catch {
        return;
      }
      if (data.type === "typing") handlers.current.onTyping();
      else if (data.type === "reply" && data.content) handlers.current.onReply(data.content);
      else if (data.type === "error" && data.message) handlers.current.onError(data.message);
    };

    ws.onclose = () => {
      if (!cancelled) setStatus("closed");
    };

    // The browser deliberately hides the handshake's HTTP status (401/403) from
    // script, so "error" here is all we get — the UI just offers a retry.
    ws.onerror = () => {
      if (!cancelled) setStatus("closed");
    };

    return () => {
      cancelled = true;
      ws.close();
      wsRef.current = null;
    };
  }, [attempt]);

  const send = useCallback((content: string): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ type: "message", content }));
    return true;
  }, []);

  // Status is flipped here (an event handler) rather than at the top of the
  // connect effect, so the effect never sets state synchronously on mount.
  const reconnect = useCallback(() => {
    setStatus("connecting");
    setAttempt((a) => a + 1);
  }, []);

  return { status, send, reconnect };
}
