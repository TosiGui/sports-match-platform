import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  PlayerStatsController,
  type PlayerStatsControllerContract,
} from "../controllers/player-stats-controller";
import type { CreatePlayerStatsData, UpdatePlayerStatsData } from "../services/player-stats-service";

const createPlayerStatsSchema = z.object({
  userId: z.string().uuid("Invalid user id"),
  sport: z.string().min(1, "Sport is required"),
  matchesPlayed: z.number().int().min(0).optional(),
  wins: z.number().int().min(0).optional(),
  losses: z.number().int().min(0).optional(),
});

const updatePlayerStatsSchema = z
  .object({
    matchesPlayed: z.number().int().min(0).optional(),
    wins: z.number().int().min(0).optional(),
    losses: z.number().int().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const idParamSchema = z.object({
  id: z.string().uuid("Invalid player stats id"),
});

const playerStatsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  sport: z.string().optional(),
});

type RegisterPlayerStatsRoutesDeps = {
  controller?: PlayerStatsControllerContract;
};

export async function registerPlayerStatsRoutes(
  app: FastifyInstance,
  deps?: RegisterPlayerStatsRoutesDeps,
) {
  const controller = deps?.controller ?? PlayerStatsController.resolve();

  app.post("/player-stats", async (request, reply) => {
    const data = createPlayerStatsSchema.parse(request.body) as CreatePlayerStatsData;

    try {
      const stats = await controller.createPlayerStats(data);
      return reply.code(201).send(stats);
    } catch (error) {
      if (error instanceof Error && error.message === "User not found") {
        return reply.code(404).send({ message: error.message });
      }
      throw error;
    }
  });

  app.get("/player-stats", async (request, reply) => {
    const query = playerStatsQuerySchema.parse(request.query);
    const stats = await controller.listPlayerStats(query.userId, query.sport);
    return reply.send(stats);
  });

  app.get("/player-stats/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const stats = await controller.getPlayerStatsById(id);
    if (!stats) {
      return reply.code(404).send({ message: "Player stats not found" });
    }
    return reply.send(stats);
  });

  app.patch("/player-stats/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const data = updatePlayerStatsSchema.parse(request.body) as UpdatePlayerStatsData;

    const stats = await controller.updatePlayerStats(id, data);
    if (!stats) {
      return reply.code(404).send({ message: "Player stats not found" });
    }
    return reply.send(stats);
  });

  app.delete("/player-stats/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const deleted = await controller.deletePlayerStats(id);
    if (!deleted) {
      return reply.code(404).send({ message: "Player stats not found" });
    }
    return reply.code(204).send();
  });
}
