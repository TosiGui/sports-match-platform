import { container, TOKENS } from "./lib/container";
import type { DatabaseClient } from "./lib/prisma";
import { ensureRedisConnection, type RedisClient } from "./lib/redis";
import { createApp } from "./src/app";

const PORT = Number(process.env.PORT ?? 3333);

async function bootstrap() {
  const prisma = container.resolve<DatabaseClient>(TOKENS.prisma);
  const redis = container.resolve<RedisClient>(TOKENS.redis);
  await ensureRedisConnection(redis);

  const app = createApp();
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`HTTP server running on http://localhost:${PORT}`);

  const shutdown = async () => {
    await Promise.allSettled([app.close(), prisma.$disconnect(), redis.quit()]);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
  console.error("Server bootstrap failed", err);
  process.exit(1);
});