import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  CourtController,
  type CourtControllerContract,
} from "../controllers/court-controller";
import type { CreateCourtData, UpdateCourtData } from "../services/court-service";

const createCourtSchema = z.object({
  name: z.string().min(1, "Name is required"),
  clubId: z.string().uuid("Invalid club id"),
});

const updateCourtSchema = z
  .object({
    name: z.string().min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const idParamSchema = z.object({
  id: z.string().uuid("Invalid court id"),
});

const courtQuerySchema = z.object({
  clubId: z.string().uuid().optional(),
});

type RegisterCourtRoutesDeps = {
  controller?: CourtControllerContract;
};

export async function registerCourtRoutes(
  app: FastifyInstance,
  deps?: RegisterCourtRoutesDeps,
) {
  const controller = deps?.controller ?? CourtController.resolve();

  app.post("/courts", async (request, reply) => {
    const data = createCourtSchema.parse(request.body) as CreateCourtData;

    try {
      const court = await controller.createCourt(data);
      return reply.code(201).send(court);
    } catch (error) {
      if (error instanceof Error && error.message === "Club not found") {
        return reply.code(404).send({ message: error.message });
      }
      throw error;
    }
  });

  app.get("/courts", async (request, reply) => {
    const query = courtQuerySchema.parse(request.query);
    const courts = await controller.listCourts(query.clubId);
    return reply.send(courts);
  });

  app.get("/courts/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const court = await controller.getCourtById(id);
    if (!court) {
      return reply.code(404).send({ message: "Court not found" });
    }
    return reply.send(court);
  });

  app.patch("/courts/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const data = updateCourtSchema.parse(request.body) as UpdateCourtData;

    const court = await controller.updateCourt(id, data);
    if (!court) {
      return reply.code(404).send({ message: "Court not found" });
    }
    return reply.send(court);
  });

  app.delete("/courts/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const deleted = await controller.deleteCourt(id);
    if (!deleted) {
      return reply.code(404).send({ message: "Court not found" });
    }
    return reply.code(204).send();
  });
}
