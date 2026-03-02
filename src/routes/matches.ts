import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  MatchController,
  type MatchControllerContract,
} from "../controllers/match-controller";
import type { CreateMatchData, UpdateMatchData, MatchFilters } from "../services/match-service";
import { serializeMatch, serializeMatches } from "../serializers/match-serializer";
import type { Sport, MatchStatus } from "../../generated/prisma/client";

const createMatchSchema = z.object({
  sport: z.string().min(1, "Sport is required"),
  dateTime: z.string().datetime("Invalid datetime format"),
  location: z.string().min(1, "Location is required"),
  maxPlayers: z.number().int().min(1, "Max players must be at least 1"),
  organizerId: z.string().uuid("Invalid organizer id"),
  cityId: z.string().uuid("Invalid city id"),
  courtId: z.string().uuid("Invalid court id").optional(),
  isPrivate: z.boolean().optional(),
  shareCode: z.string().optional(),
});

const updateMatchSchema = z
  .object({
    sport: z.string().min(1).optional(),
    dateTime: z.string().datetime().optional(),
    location: z.string().min(1).optional(),
    maxPlayers: z.number().int().min(1).optional(),
    status: z.string().optional(),
    courtId: z.string().uuid("Invalid court id").optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const idParamSchema = z.object({
  id: z.string().uuid("Invalid match id"),
});

const matchQuerySchema = z.object({
  sport: z.string().optional(),
  organizerId: z.string().uuid().optional(),
});

type RegisterMatchRoutesDeps = {
  controller?: MatchControllerContract;
};

export async function registerMatchRoutes(
  app: FastifyInstance,
  deps?: RegisterMatchRoutesDeps,
) {
  const controller = deps?.controller ?? MatchController.resolve();

  app.post("/matches", async (request, reply) => {
    const data = createMatchSchema.parse(request.body);
    const matchData: CreateMatchData = {
      sport: data.sport as any,
      dateTime: new Date(data.dateTime),
      location: data.location,
      maxPlayers: data.maxPlayers,
      organizerId: data.organizerId,
      cityId: data.cityId,
      courtId: data.courtId,
      isPrivate: data.isPrivate,
      shareCode: data.shareCode,
    };

    try {
      const created = await controller.createMatch(matchData);
      const full = await controller.getMatchById(created.id);
      return reply.code(201).send(full ? serializeMatch(full as any) : created);
    } catch (error) {
      if (error instanceof Error && 
          (error.message === "Organizer not found" || 
           error.message === "City not found" || 
           error.message === "Court not found")) {
        return reply.code(404).send({ message: error.message });
      }
      throw error;
    }
  });

  app.get("/matches", async (request, reply) => {
    const query = matchQuerySchema.parse(request.query);
    const filters: MatchFilters = {};

    if (query.sport) {
      filters.sport = query.sport.toUpperCase() as Sport;
    }
    if (query.organizerId) {
      filters.organizerId = query.organizerId;
    }

    const matches = await controller.listMatches(filters);
    return reply.send(serializeMatches(matches as any));
  });

  app.get("/matches/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const match = await controller.getMatchById(id);
    if (!match) {
      return reply.code(404).send({ message: "Match not found" });
    }
    return reply.send(serializeMatch(match as any));
  });

  app.patch("/matches/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const data = updateMatchSchema.parse(request.body);

    const updateData: UpdateMatchData = {};
    if (data.sport !== undefined) {
      updateData.sport = data.sport.toUpperCase() as Sport;
    }
    if (data.dateTime !== undefined) {
      updateData.dateTime = new Date(data.dateTime);
    }
    if (data.location !== undefined) {
      updateData.location = data.location;
    }
    if (data.maxPlayers !== undefined) {
      updateData.maxPlayers = data.maxPlayers;
    }
    if (data.status !== undefined) {
      updateData.status = data.status.toUpperCase() as MatchStatus;
    }
    if (data.courtId !== undefined) {
      updateData.courtId = data.courtId;
    }

    const updated = await controller.updateMatch(id, updateData);
    if (!updated) {
      return reply.code(404).send({ message: "Match not found" });
    }
    const full = await controller.getMatchById(id);
    return reply.send(full ? serializeMatch(full as any) : updated);
  });

  app.delete("/matches/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const deleted = await controller.deleteMatch(id);
    if (!deleted) {
      return reply.code(404).send({ message: "Match not found" });
    }
    return reply.code(204).send();
  });
}
