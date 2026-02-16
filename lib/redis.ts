import "dotenv/config";
import { createClient } from "redis";

export type RedisClient = ReturnType<typeof createClient>;

export function createRedisClient(connectionUrl?: string): RedisClient {
  const url = connectionUrl ?? process.env.REDIS_URL ?? "redis://localhost:6379";
  const client = createClient({ url });
  client.on("error", (err) => {
    console.error("Redis connection error", err);
  });
  return client;
}

export async function ensureRedisConnection(client: RedisClient): Promise<RedisClient> {
  if (!client.isOpen) {
    await client.connect();
  }
  return client;
}
