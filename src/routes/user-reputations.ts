import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  UserReputationController,
  type UserReputationControllerContract,
} from "../controllers/user-reputation-controller";
import type { CreateUserReputationData, UpdateUserReputationData } from "../services/user-reputation-service";

const createUserReputationSchema = z.object({
  userId: z.string().uuid("Invalid user id"),
  noShows: z.number().int().min(0).optional(),
  cancellations: z.number().int().min(0).optional(),
});

const updateUserReputationSchema = z
  .object({
    noShows: z.number().int().min(0).optional(),
    cancellations: z.number().int().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const idParamSchema = z.object({
  id: z.string().uuid("Invalid reputation id"),
});

const userIdParamSchema = z.object({
  userId: z.string().uuid("Invalid user id"),
});

type RegisterUserReputationRoutesDeps = {
  controller?: UserReputationControllerContract;
};

export async function registerUserReputationRoutes(
  app: FastifyInstance,
  deps?: RegisterUserReputationRoutesDeps,
) {
  const controller = deps?.controller ?? UserReputationController.resolve();

  app.post("/user-reputations", async (request, reply) => {
    const data = createUserReputationSchema.parse(request.body) as CreateUserReputationData;

    try {
      const reputation = await controller.createUserReputation(data);
      return reply.code(201).send(reputation);
    } catch (error) {
      if (error instanceof Error && 
          (error.message === "User not found" || error.message === "User reputation already exists")) {
        const statusCode = error.message === "User not found" ? 404 : 409;
        return reply.code(statusCode).send({ message: error.message });
      }
      throw error;
    }
  });

  app.get("/user-reputations", async (_request, reply) => {
    const reputations = await controller.listUserReputations();
    return reply.send(reputations);
  });

  app.get("/user-reputations/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const reputation = await controller.getUserReputationById(id);
    if (!reputation) {
      return reply.code(404).send({ message: "User reputation not found" });
    }
    return reply.send(reputation);
  });

  app.get("/user-reputations/user/:userId", async (request, reply) => {
    const { userId } = userIdParamSchema.parse(request.params);
    const reputation = await controller.getUserReputationByUserId(userId);
    if (!reputation) {
      return reply.code(404).send({ message: "User reputation not found" });
    }
    return reply.send(reputation);
  });

  app.patch("/user-reputations/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const data = updateUserReputationSchema.parse(request.body) as UpdateUserReputationData;

    const reputation = await controller.updateUserReputation(id, data);
    if (!reputation) {
      return reply.code(404).send({ message: "User reputation not found" });
    }
    return reply.send(reputation);
  });

  app.delete("/user-reputations/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const deleted = await controller.deleteUserReputation(id);
    if (!deleted) {
      return reply.code(404).send({ message: "User reputation not found" });
    }
    return reply.code(204).send();
  });
}
