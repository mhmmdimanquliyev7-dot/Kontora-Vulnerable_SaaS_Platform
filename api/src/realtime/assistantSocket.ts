import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";

import cookie from "cookie";
import { WebSocketServer, type WebSocket } from "ws";
import { z } from "zod";

import { env } from "@/config/env.js";
import { ACCESS_TOKEN_COOKIE } from "@/lib/cookies.js";
import { verifyAccessToken } from "@/lib/jwt.js";
import * as assistantService from "@/services/assistant.service.js";
import { Role } from "@kontora/db";

// Real-time transport for the assistant chat.
//
// WebSockets are NOT protected by the same-origin policy or by CORS: a browser
// will happily let evil.example open a socket to this server, and it will
// attach the user's cookies while doing it (the handshake is a plain HTTP GET).
// So the two controls below are load-bearing, not decoration:
//
//   1. Origin allowlist — the handshake's Origin header must equal the
//      configured frontend origin. This is what stops Cross-Site WebSocket
//      Hijacking (CSWSH), where a malicious page opens an authenticated socket
//      on the victim's behalf and reads their data. CORS would have covered
//      this for fetch(); for ws it has to be done by hand.
//   2. Authentication on the handshake — the access-token cookie is verified
//      before the socket is accepted. A connection is never upgraded first and
//      authenticated later; an unauthenticated handshake is refused outright.
//
// The role gate then mirrors the REST route exactly (CLIENT_GUEST excluded), so
// the socket can't become a softer way in than POST /api/assistant/chat.

const PATH = "/ws/assistant";

// A chat turn is cheap for us (rule-based matcher + a couple of tenant-scoped
// queries) but not free, and a socket can send far faster than a human types.
const MAX_MESSAGES_PER_WINDOW = 20;
const RATE_WINDOW_MS = 60_000;
const MAX_MESSAGE_BYTES = 4 * 1024;

const incomingSchema = z.object({
  type: z.literal("message"),
  // Mirrors chatMessageSchema on the REST side.
  content: z.string().trim().min(1, "Message is required").max(1000),
});

interface SocketState {
  userId: string;
  companyId: string;
  role: Role;
  windowStart: number;
  count: number;
}

const state = new WeakMap<WebSocket, SocketState>();

function isAllowedOrigin(origin: string | undefined): boolean {
  // No Origin at all means a non-browser client (curl, a script). Those aren't
  // subject to CSWSH — the attack needs a victim's browser to attach cookies —
  // but they also have no business here, and refusing them keeps this endpoint
  // to exactly one known caller.
  if (!origin) return false;
  return origin === env.CORS_ORIGIN;
}

function rejectUpgrade(socket: Duplex, status: number, reason: string): void {
  socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

function authenticate(req: IncomingMessage): SocketState | null {
  const header = req.headers.cookie;
  if (!header) return null;

  const cookies = cookie.parse(header);
  const token = cookies[ACCESS_TOKEN_COOKIE];
  if (!token) return null;

  try {
    const payload = verifyAccessToken(token);
    return {
      userId: payload.sub,
      companyId: payload.companyId,
      role: payload.role,
      windowStart: Date.now(),
      count: 0,
    };
  } catch {
    return null;
  }
}

function send(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
}

function allowMessage(s: SocketState): boolean {
  const now = Date.now();
  if (now - s.windowStart > RATE_WINDOW_MS) {
    s.windowStart = now;
    s.count = 0;
  }
  s.count += 1;
  return s.count <= MAX_MESSAGES_PER_WINDOW;
}

export function attachAssistantSocket(server: Server): void {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });

  server.on("upgrade", (req, socket, head) => {
    // Only claim our own path — anything else is left alone so a future ws
    // endpoint (or a stray probe) isn't swallowed by this handler.
    const { pathname } = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (pathname !== PATH) return;

    if (!isAllowedOrigin(req.headers.origin)) {
      rejectUpgrade(socket, 403, "Forbidden");
      return;
    }

    const authed = authenticate(req);
    if (!authed) {
      rejectUpgrade(socket, 401, "Unauthorized");
      return;
    }

    // Same role gate as assistant.routes.ts.
    if (authed.role === Role.CLIENT_GUEST) {
      rejectUpgrade(socket, 403, "Forbidden");
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      state.set(ws, authed);
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    const s = state.get(ws);
    if (!s) {
      ws.close(1011, "Missing connection state");
      return;
    }

    send(ws, { type: "ready" });

    ws.on("message", (raw) => {
      const current = state.get(ws);
      if (!current) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(String(raw));
      } catch {
        send(ws, { type: "error", message: "Malformed message." });
        return;
      }

      const result = incomingSchema.safeParse(parsed);
      if (!result.success) {
        send(ws, {
          type: "error",
          message: result.error.issues.map((i) => i.message).join(", "),
        });
        return;
      }

      if (!allowMessage(current)) {
        send(ws, { type: "error", message: "You're sending messages too quickly. Please slow down." });
        return;
      }

      // The viewer is built from the token verified at handshake time — never
      // from anything the socket sends — so tenant scoping here is identical to
      // the REST path.
      const viewer = { userId: current.userId, companyId: current.companyId, role: current.role };

      send(ws, { type: "typing" });
      assistantService
        .answerQuestion(viewer, result.data.content)
        .then((reply) => send(ws, { type: "reply", content: reply }))
        .catch((err: unknown) => {
          console.error("Assistant socket error:", err);
          send(ws, { type: "error", message: "Something went wrong answering that." });
        });
    });

    ws.on("close", () => {
      state.delete(ws);
    });
  });
}
