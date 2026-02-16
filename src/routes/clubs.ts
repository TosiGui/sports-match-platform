import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  ClubController,
  type ClubControllerContract,
} from "../controllers/club-controller";
import type { CreateClubData, UpdateClubData } from "../services/club-service";

const createClubSchema = z.object({
  name: z.string().min(1, "Name is required"),
  cityId: z.string().uuid("Invalid city id"),
  ownerId: z.string().uuid("Invalid owner id"),
});

const updateClubSchema = z
  .object({
    name: z.string().min(1).optional(),
    cityId: z.string().uuid("Invalid city id").optional(),
    ownerId: z.string().uuid("Invalid owner id").optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const idParamSchema = z.object({
  id: z.string().uuid("Invalid club id"),
});

const clubQuerySchema = z.object({
  cityId: z.string().uuid().optional(),
});

type RegisterClubRoutesDeps = {
  controller?: ClubControllerContract;
};

export async function registerClubRoutes(
  app: FastifyInstance,
  deps?: RegisterClubRoutesDeps,
) {
  const controller = deps?.controller ?? ClubController.resolve();

  app.post("/clubs", async (request, reply) => {
    const data = createClubSchema.parse(request.body) as CreateClubData;

    try {
      const club = await controller.createClub(data);
      return reply.code(201).send(club);
    } catch (error) {
      if (error instanceof Error && 
          (error.message === "City not found" || error.message === "Owner not found")) {
        return reply.code(404).send({ message: error.message });
      }
      throw error;
    }
  });

  app.get("/clubs", async (request, reply) => {
    const query = clubQuerySchema.parse(request.query);
    const clubs = await controller.listClubs(query.cityId);
    return reply.send(clubs);
  });

  app.get("/clubs/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const club = await controller.getClubById(id);
    if (!club) {
      return reply.code(404).send({ message: "Club not found" });
    }
    return reply.send(club);
  });

  app.patch("/clubs/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const data = updateClubSchema.parse(request.body) as UpdateClubData;

    try {
      const club = await controller.updateClub(id, data);
      if (!club) {
        return reply.code(404).send({ message: "Club not found" });
      }
      return reply.send(club);
    } catch (error) {
      if (error instanceof Error && 
          (error.message === "City not found" || error.message === "Owner not found")) {
        return reply.code(404).send({ message: error.message });
      }
      throw error;
    }
  });

  app.delete("/clubs/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const deleted = await controller.deleteClub(id);
    if (!deleted) {
      return reply.code(404).send({ message: "Club not found" });
    }
    return reply.code(204).send();
  });
}
