import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import fjwt from "@fastify/jwt";
import { ZodError } from "zod";
import { registerRoutes } from "./routes/index.ts";
import { registerAuthRoutes } from "./routes/auth.js";

export const createApp = (): FastifyInstance => {
  const app = Fastify();

  app.register(cors, {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  });

  app.register(fjwt, {
    secret: process.env.JWT_SECRET || "dev-secret-change-me",
  });

  app.decorate("authenticate", async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ message: "Unauthorized" });
    }
  });

  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  app.register(async (instance) => {
    await registerAuthRoutes(instance);
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
