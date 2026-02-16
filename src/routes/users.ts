import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  UserController,
  type UserControllerContract,
} from "../controllers/user-controller";
import type { CreateUserData, UpdateUserData } from "../services/user-service";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(8).max(32).optional(),
  email: z.string().email("Invalid email format").optional(),
});

const updateUserSchema = createUserSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const idParamSchema = z.object({
  id: z.string().uuid("Invalid user id"),
});

type RegisterUserRoutesDeps = {
  controller?: UserControllerContract;
};

export async function registerUserRoutes(
  app: FastifyInstance,
  deps?: RegisterUserRoutesDeps,
) {
  const controller = deps?.controller ?? UserController.resolve();

  app.post("/users", async (request, reply) => {
    const data = createUserSchema.parse(request.body) as CreateUserData;
    const user = await controller.createUser(data);
    return reply.code(201).send(user);
  });

  app.get("/users", async (_request, reply) => {
    const users = await controller.listUsers();
    return reply.send(users);
  });

  app.get("/users/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const user = await controller.getUserById(id);
    if (!user) {
      return reply.code(404).send({ message: "User not found" });
    }
    return reply.send(user);
  });

  app.patch("/users/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const data = updateUserSchema.parse(request.body) as UpdateUserData;

    const user = await controller.updateUser(id, data);
    if (!user) {
      return reply.code(404).send({ message: "User not found" });
    }
    return reply.send(user);
  });

  app.delete("/users/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const deleted = await controller.deleteUser(id);
    if (!deleted) {
      return reply.code(404).send({ message: "User not found" });
    }
    return reply.code(204).send();
  });
}
