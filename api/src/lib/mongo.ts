import mongoose from "mongoose";

import { env } from "@/config/env.js";

let connectPromise: Promise<typeof mongoose> | null = null;

// Connected lazily (on first use) rather than blocking server startup —
// matches how the Postgres pool and Redis client are already handled in
// this codebase (they connect on first query too). Mongo backs exactly one
// feature (invoice comments); the rest of the app works fine if it's briefly
// unavailable.
export function connectMongo(): Promise<typeof mongoose> {
  connectPromise ??= mongoose.connect(env.MONGODB_URL);
  return connectPromise;
}

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});
