import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { registerRoutes } from "./routes/index.ts";

export const createApp = (): FastifyInstance => {
  const app = Fastify();

  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  app.register(async (instance) => {
    await registerRoutes(instance);
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: "Validation error",
        issues: error.issues,
      });
    }

    console.error("Unhandled error", error);
    return reply.status(500).send({ message: "Internal server error" });
  });

  return app;
};

export type App = ReturnType<typeof createApp>;
