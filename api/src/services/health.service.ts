import { connectMongo } from "@/lib/mongo.js";
import { prisma } from "@/lib/prisma.js";
import { redis } from "@/lib/redis.js";

export type DependencyStatus = "up" | "down";

export interface HealthReport {
  status: "ok" | "degraded";
  uptimeSeconds: number;
  timestamp: string;
  dependencies: {
    database: DependencyStatus;
    redis: DependencyStatus;
    mongo: DependencyStatus;
  };
}

async function checkDatabase(): Promise<DependencyStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "up";
  } catch {
    return "down";
  }
}

async function checkRedis(): Promise<DependencyStatus> {
  try {
    const pong = await redis.ping();
    return pong === "PONG" ? "up" : "down";
  } catch {
    return "down";
  }
}

async function checkMongo(): Promise<DependencyStatus> {
  try {
    const conn = await connectMongo();
    if (!conn.connection.db) return "down";
    await conn.connection.db.admin().ping();
    return "up";
  } catch {
    return "down";
  }
}

export async function getHealthReport(): Promise<HealthReport> {
  const [database, redisStatus, mongoStatus] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkMongo(),
  ]);

  const dependencies = { database, redis: redisStatus, mongo: mongoStatus };
  const status = Object.values(dependencies).every((s) => s === "up") ? "ok" : "degraded";

  return {
    status,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    dependencies,
  };
}
