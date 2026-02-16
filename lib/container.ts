import type { DatabaseClient } from "./prisma";
import { createPrismaClient } from "./prisma";
import type { RedisClient } from "./redis";
import { createRedisClient } from "./redis";

type Provider<T> = () => T;

class Container {
  private factories = new Map<symbol, Provider<unknown>>();
  private singletons = new Map<symbol, unknown>();

  registerSingleton<T>(token: symbol, factory: Provider<T>) {
    if (this.factories.has(token)) {
      throw new Error(`Token already registered for ${String(token.description)}`);
    }
    this.factories.set(token, factory as Provider<unknown>);
  }

  resolve<T>(token: symbol): T {
    if (!this.singletons.has(token)) {
      const factory = this.factories.get(token);
      if (!factory) {
        throw new Error(`No provider registered for token ${String(token.description)}`);
      }
      const instance = factory();
      this.singletons.set(token, instance);
    }
    return this.singletons.get(token) as T;
  }
}

export const TOKENS = {
  prisma: Symbol("PrismaClient"),
  redis: Symbol("RedisClient"),
} as const;

export const container = new Container();

container.registerSingleton<DatabaseClient>(TOKENS.prisma, createPrismaClient);
container.registerSingleton<RedisClient>(TOKENS.redis, () => createRedisClient());
