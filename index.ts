import { container, TOKENS } from "./lib/container";
import type { DatabaseClient } from "./lib/prisma";
import { ensureRedisConnection, type RedisClient } from "./lib/redis";

async function main() {
  const prisma = container.resolve<DatabaseClient>(TOKENS.prisma);
  const redis = container.resolve<RedisClient>(TOKENS.redis);

  await ensureRedisConnection(redis);
  await redis.set("healthcheck", new Date().toISOString());
  const value = await redis.get("healthcheck");
  console.log("Redis connected. Last healthcheck:", value);

  await shutdown({ prisma, redis });
}

async function shutdown({
  prisma,
  redis,
}: {
  prisma: DatabaseClient;
  redis: RedisClient;
}) {
  await Promise.all([prisma.$disconnect(), redis.quit()]);
}

main().catch((err) => {
  console.error("Redis sample failed", err);
  process.exit(1);
});