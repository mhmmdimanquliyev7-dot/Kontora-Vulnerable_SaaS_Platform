import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "@/config/env.js";
import { UPLOADS_ROOT } from "@/lib/uploads.js";
import { errorHandler } from "@/middleware/errorHandler.js";
import { notFoundHandler } from "@/middleware/notFound.js";
import { apiRouter } from "@/routes/index.js";

export function createApp(): Express {
  const app = express();

  // Behind a reverse proxy in production, this makes req.ip and
  // `secure: true` cookies reflect the real client rather than the proxy.
  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

  // helmet's default Cross-Origin-Resource-Policy (same-origin) would block
  // the frontend, on a different origin, from loading logo images — relax
  // it only for this static path, not app-wide.
  app.use(
    "/uploads",
    express.static(UPLOADS_ROOT, {
      setHeaders: (res) => res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"),
    }),
  );

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
