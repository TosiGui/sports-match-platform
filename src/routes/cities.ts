import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  CityController,
  type CityControllerContract,
} from "../controllers/city-controller";
import type { CreateCityData, UpdateCityData } from "../services/city-service";

const createCitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  state: z.string().min(2, "State is required"),
});

const updateCitySchema = createCitySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const idParamSchema = z.object({
  id: z.string().uuid("Invalid city id"),
});

type RegisterCityRoutesDeps = {
  controller?: CityControllerContract;
};

export async function registerCityRoutes(
  app: FastifyInstance,
  deps?: RegisterCityRoutesDeps,
) {
  const controller = deps?.controller ?? CityController.resolve();

  app.post("/cities", async (request, reply) => {
    const data = createCitySchema.parse(request.body) as CreateCityData;
    const city = await controller.createCity(data);
    return reply.code(201).send(city);
  });

  app.get("/cities", async (_request, reply) => {
    const cities = await controller.listCities();
    return reply.send(cities);
  });

  app.get("/cities/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const city = await controller.getCityById(id);
    if (!city) {
      return reply.code(404).send({ message: "City not found" });
    }
    return reply.send(city);
  });

  app.patch("/cities/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const data = updateCitySchema.parse(request.body) as UpdateCityData;

    const city = await controller.updateCity(id, data);
    if (!city) {
      return reply.code(404).send({ message: "City not found" });
    }
    return reply.send(city);
  });

  app.delete("/cities/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const deleted = await controller.deleteCity(id);
    if (!deleted) {
      return reply.code(404).send({ message: "City not found" });
    }
    return reply.code(204).send();
  });
}
