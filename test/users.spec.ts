import Fastify from "fastify";
import { ZodError } from "zod";
import { describe, expect, it, vi } from "vitest";
import type { UserControllerContract } from "../src/controllers/user-controller";
import { registerUserRoutes } from "../src/routes/users";

type ControllerMock = UserControllerContract & {
  createUser: ReturnType<typeof vi.fn>;
  listUsers: ReturnType<typeof vi.fn>;
  getUserById: ReturnType<typeof vi.fn>;
  updateUser: ReturnType<typeof vi.fn>;
  deleteUser: ReturnType<typeof vi.fn>;
};

function createControllerMock(overrides?: Partial<UserControllerContract>): ControllerMock {
  return {
    createUser: vi.fn(overrides?.createUser ?? (async () => ({ id: "1", name: "John", phone: null, email: null, googleId: null, avatar: null, createdAt: new Date(), matches: [], organizedMatches: [] }))),
    listUsers: vi.fn(overrides?.listUsers ?? (async () => [])),
    getUserById: vi.fn(overrides?.getUserById ?? (async () => null)),
    updateUser: vi.fn(overrides?.updateUser ?? (async () => null)),
    deleteUser: vi.fn(overrides?.deleteUser ?? (async () => true)),
  } as ControllerMock;
}

async function buildApp(controller: ControllerMock) {
  const app = Fastify();
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        message: "Validation error",
        issues: error.issues,
      });
    }
    console.error("Test server error", error);
    return reply.code(500).send({ message: "Internal server error" });
  });
  await app.register(async (instance) => {
    await registerUserRoutes(instance, { controller });
  });
  return app;
}

describe("User routes", () => {
  it("creates a user", async () => {
    const controller = createControllerMock({
      createUser: async (data) => ({
        id: "user-1",
        name: data.name,
        phone: data.phone ?? null,
        email: null,
        googleId: null,
        avatar: null,
        createdAt: new Date(),
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/users",
      payload: { name: "John", phone: "12345678" },
    });

    expect(response.statusCode).toBe(201);
    expect(controller.createUser).toHaveBeenCalledWith({ name: "John", phone: "12345678" });
  });

  it("returns 404 when user not found", async () => {
    const controller = createControllerMock({
      getUserById: async () => null,
    });
    const app = await buildApp(controller);

    const response = await app.inject({ method: "GET", url: "/users/11111111-1111-4111-8111-111111111111" });

    expect(response.statusCode).toBe(404);
  });

  it("updates a user", async () => {
    const controller = createControllerMock({
      updateUser: async (_id, data) => ({
        id: "user-1",
        name: data.name ?? "John",
        phone: data.phone ?? null,
        email: null,
        googleId: null,
        avatar: null,
        createdAt: new Date(),
        matches: [],
        organizedMatches: [],
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/users/22222222-2222-4222-8222-222222222222",
      payload: { name: "Updated" },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateUser).toHaveBeenCalledWith("22222222-2222-4222-8222-222222222222", { name: "Updated" });
  });

  it("lists all users", async () => {
    const controller = createControllerMock({
      listUsers: async () => [
        { id: "1", name: "User 1", phone: null, email: null, googleId: null, avatar: null, createdAt: new Date() },
        { id: "2", name: "User 2", phone: "12345678", email: null, googleId: null, avatar: null, createdAt: new Date() },
      ],
    });
    const app = await buildApp(controller);

    const response = await app.inject({ method: "GET", url: "/users" });

    expect(response.statusCode).toBe(200);
    expect(controller.listUsers).toHaveBeenCalled();
    const body = JSON.parse(response.body);
    expect(body).toHaveLength(2);
  });

  it("deletes a user", async () => {
    const controller = createControllerMock({
      deleteUser: async () => true,
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "DELETE",
      url: "/users/33333333-3333-4333-8333-333333333333",
    });

    expect(response.statusCode).toBe(204);
    expect(controller.deleteUser).toHaveBeenCalledWith("33333333-3333-4333-8333-333333333333");
  });

  it("returns 404 when deleting non-existent user", async () => {
    const controller = createControllerMock({
      deleteUser: async () => false,
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "DELETE",
      url: "/users/44444444-4444-4444-8444-444444444444",
    });

    expect(response.statusCode).toBe(404);
  });

  it("validates required name on create", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/users",
      payload: { name: "" },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Validation error");
  });

  it("validates phone min length", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/users",
      payload: { name: "John", phone: "1234" },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Validation error");
  });

  it("validates phone max length", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/users",
      payload: { name: "John", phone: "1".repeat(33) },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Validation error");
  });

  it("validates UUID format on GET", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "GET",
      url: "/users/invalid-uuid",
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Validation error");
  });

  it("validates UUID format on PATCH", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/users/not-a-uuid",
      payload: { name: "Updated" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("validates UUID format on DELETE", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "DELETE",
      url: "/users/invalid",
    });

    expect(response.statusCode).toBe(400);
  });

  it("validates at least one field on update", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/users/55555555-5555-4555-8555-555555555555",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Validation error");
  });

  it("creates user with optional phone", async () => {
    const controller = createControllerMock({
      createUser: async (data) => ({
        id: "user-1",
        name: data.name,
        phone: data.phone ?? null,
        email: null,
        googleId: null,
        avatar: null,
        createdAt: new Date(),
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/users",
      payload: { name: "John" },
    });

    expect(response.statusCode).toBe(201);
    expect(controller.createUser).toHaveBeenCalledWith({ name: "John" });
  });

  it("updates only name", async () => {
    const controller = createControllerMock({
      updateUser: async (_id, data) => ({
        id: "user-1",
        name: data.name ?? "Original",
        phone: "12345678",
        email: null,
        googleId: null,
        avatar: null,
        createdAt: new Date(),
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/users/66666666-6666-4666-8666-666666666666",
      payload: { name: "NewName" },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateUser).toHaveBeenCalledWith("66666666-6666-4666-8666-666666666666", { name: "NewName" });
  });

  it("updates only phone", async () => {
    const controller = createControllerMock({
      updateUser: async (_id, data) => ({
        id: "user-1",
        name: "John",
        phone: data.phone ?? null,
        email: null,
        googleId: null,
        avatar: null,
        createdAt: new Date(),
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/users/77777777-7777-4777-8777-777777777777",
      payload: { phone: "99999999" },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateUser).toHaveBeenCalledWith("77777777-7777-4777-8777-777777777777", { phone: "99999999" });
  });

  it("returns 404 when updating non-existent user", async () => {
    const controller = createControllerMock({
      updateUser: async () => null,
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/users/88888888-8888-4888-8888-888888888888",
      payload: { name: "Updated" },
    });

    expect(response.statusCode).toBe(404);
  });
});
