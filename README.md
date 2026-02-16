# sports-match-platform

## Redis setup

1. Start the Docker services (Postgres + Redis):
   ```bash
   docker compose up -d
   ```
2. Copy `.env_sample` to `.env` and adjust `REDIS_URL` if needed.
3. Run the sample script to verify the Redis connection:
   ```bash
   pnpm ts-node index.ts
   ```
   You should see `Redis connected. Last healthcheck: ...` in the console.

The shared Redis client factory lives in `lib/redis.ts` and can be imported anywhere in the codebase:
```ts
import { ensureRedisConnection, createRedisClient } from "./lib/redis";

const redis = createRedisClient();
await ensureRedisConnection(redis);
await redis.set("key", "value");
```

## Dependency Injection

The project exposes a lightweight DI container to keep dependencies centralized:

```ts
import { container, TOKENS } from "./lib/container";
import type { DatabaseClient } from "./lib/prisma";
import type { RedisClient } from "./lib/redis";

const prisma = container.resolve<DatabaseClient>(TOKENS.prisma);
const redis = container.resolve<RedisClient>(TOKENS.redis);
```

To register new singletons, add a new `Symbol` to `TOKENS` and call
`container.registerSingleton(token, factory)` in `lib/container.ts`.