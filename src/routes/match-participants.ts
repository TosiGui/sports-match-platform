import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  MatchParticipantController,
  type MatchParticipantControllerContract,
} from "../controllers/match-participant-controller";
import type { JoinMatchData, UpdateParticipantStatusData } from "../services/match-participant-service";

const joinMatchSchema = z.object({
  userId: z.string().uuid("Invalid user id"),
  status: z.enum(["pending", "confirmed", "declined"], {
    message: "Status must be pending, confirmed, or declined",
  }),
});

const updateStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "declined"], {
    message: "Status must be pending, confirmed, or declined",
  }),
});

const matchIdParamSchema = z.object({
  matchId: z.string().uuid("Invalid match id"),
});

const participantIdParamSchema = z.object({
  id: z.string().uuid("Invalid participant id"),
});

const userIdParamSchema = z.object({
  userId: z.string().uuid("Invalid user id"),
});

type RegisterMatchParticipantRoutesDeps = {
  controller?: MatchParticipantControllerContract;
};

export async function registerMatchParticipantRoutes(
  app: FastifyInstance,
  deps?: RegisterMatchParticipantRoutesDeps,
) {
  const controller = deps?.controller ?? MatchParticipantController.resolve();

  app.post("/matches/:matchId/participants", async (request, reply) => {
    const { matchId } = matchIdParamSchema.parse(request.params);
    const data = joinMatchSchema.parse(request.body);

    const joinData: JoinMatchData = {
      matchId,
      userId: data.userId,
      status: data.status,
    };

    try {
      const participant = await controller.joinMatch(joinData);
      return reply.code(201).send(participant);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Match not found") {
          return reply.code(404).send({ message: error.message });
        }
        if (error.message === "User not found") {
          return reply.code(404).send({ message: error.message });
        }
        if (error.message === "User already joined this match") {
          return reply.code(409).send({ message: error.message });
        }
        if (error.message === "Match is full") {
          return reply.code(409).send({ message: error.message });
        }
      }
      throw error;
    }
  });

  app.get("/matches/:matchId/participants", async (request, reply) => {
    const { matchId } = matchIdParamSchema.parse(request.params);
    const participants = await controller.listParticipantsByMatch(matchId);
    return reply.send(participants);
  });

  app.patch("/participants/:id/status", async (request, reply) => {
    const { id } = participantIdParamSchema.parse(request.params);
    const data = updateStatusSchema.parse(request.body);

    const updateData: UpdateParticipantStatusData = {
      status: data.status,
    };

    try {
      const participant = await controller.updateParticipantStatus(id, updateData);
      if (!participant) {
        return reply.code(404).send({ message: "Participant not found" });
      }
      return reply.send(participant);
    } catch (error) {
      if (error instanceof Error && error.message === "Match is full") {
        return reply.code(409).send({ message: error.message });
      }
      throw error;
    }
  });

  app.delete("/matches/:matchId/participants/:userId", async (request, reply) => {
    const { matchId } = matchIdParamSchema.parse(request.params);
    const { userId } = userIdParamSchema.parse(request.params);

    const removed = await controller.leaveMatch(matchId, userId);
    if (!removed) {
      return reply.code(404).send({ message: "Participant not found" });
    }
    return reply.code(204).send();
  });
}
