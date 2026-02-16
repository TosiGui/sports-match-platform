import type { FastifyInstance } from "fastify";
import { registerUserRoutes } from "./users";
import { registerMatchRoutes } from "./matches";
import { registerMatchParticipantRoutes } from "./match-participants";

export async function registerRoutes(app: FastifyInstance) {
  await registerUserRoutes(app);
  await registerMatchRoutes(app);
  await registerMatchParticipantRoutes(app);
}
