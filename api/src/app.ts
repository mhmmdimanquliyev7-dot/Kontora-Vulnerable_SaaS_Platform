import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, type RequestHandler } from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";

import { env } from "@/config/env.js";
import { yoga } from "@/gql/server.js";
import { UPLOADS_ROOT } from "@/lib/uploads.js";
import { errorHandler } from "@/middleware/errorHandler.js";
import { notFoundHandler } from "@/middleware/notFound.js";
import { requireAuth } from "@/middleware/requireAuth.js";
import { apiRouter } from "@/routes/index.js";

// GraphiQL's HTML pulls its bundle, stylesheet and Monaco worker files from
// unpkg, runs inline bootstrap scripts, and spins up web workers from blob:
// URLs — none of which helmet's default CSP allows. This middleware widens the
// policy for the GraphiQL *page* only (a GET that asks for HTML); the JSON API
// responses (POST) keep helmet's strict policy, and it is a no-op in
// production, where GraphiQL isn't served at all. The sources are pinned to the
// exact hosts GraphiQL uses rather than a blanket `*`.
const graphiqlCsp: RequestHandler = (req, res, next) => {
  const wantsHtml = req.method === "GET" && (req.headers.accept ?? "").includes("text/html");
  if (env.NODE_ENV !== "production" && wantsHtml) {
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://unpkg.com blob:",
        "style-src 'self' 'unsafe-inline' https://unpkg.com",
        "img-src 'self' data: https://raw.githubusercontent.com",
        "font-src 'self' https: data:",
        "connect-src 'self' https://unpkg.com",
        "worker-src blob:",
        "child-src blob:",
      ].join("; "),
    );
  }
  next();
};

export function createApp(): Express {
  const app = express();

  // Behind a reverse proxy in production, this makes req.ip and
  // `secure: true` cookies reflect the real client rather than the proxy.
  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

  // GraphQL is mounted BEFORE express.json() on purpose: Yoga reads and parses
  // the request body itself, and a body already consumed by express.json()
  // would leave it waiting on an exhausted stream. cookieParser above still
  // runs first, which is what requireAuth needs.
  //
  // requireAuth in front of Yoga means there is no unauthenticated GraphQL
  // surface at all — not even introspection or a syntax error — and it fixes
  // the tenant (req.auth.companyId) before a single resolver runs.
  //
  // graphiqlCsp relaxes helmet's Content-Security-Policy for the GraphiQL UI
  // ONLY. helmet's default `script-src 'self'` (no inline, no CDN, no blob
  // workers) blocks every asset the GraphiQL page loads from unpkg, so without
  // this the playground renders a blank "Loading…" shell that never hydrates.
  // The cast is the documented Yoga+Express wart: the Yoga instance IS a valid
  // Node request listener, but its call signature is (req, ctx) rather than
  // express's (req, res, next), so RequestHandler doesn't describe it.
  app.use("/graphql", requireAuth, graphiqlCsp, yoga as unknown as RequestHandler);

  app.use(express.json());

  // helmet's default Cross-Origin-Resource-Policy (same-origin) would block
  // the frontend, on a different origin, from loading logo images — relax
  // it only for this static path, not app-wide.
  app.use(
    "/uploads",
    express.static(UPLOADS_ROOT, {
      setHeaders: (res) => res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"),
    }),
  );

  // Public downloads (brochures, API docs, sample configs).
  app.use(
    "/public",
    express.static(path.resolve(process.cwd(), "public-files"), { dotfiles: "allow" }),
  );

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
