import Fastify from "fastify";
import { ZodError } from "zod";
import { describe, expect, it, vi } from "vitest";
import type { MatchControllerContract } from "../src/controllers/match-controller";
import { registerMatchRoutes } from "../src/routes/matches";

type ControllerMock = MatchControllerContract & {
  createMatch: ReturnType<typeof vi.fn>;
  listMatches: ReturnType<typeof vi.fn>;
  getMatchById: ReturnType<typeof vi.fn>;
  updateMatch: ReturnType<typeof vi.fn>;
  deleteMatch: ReturnType<typeof vi.fn>;
};

function createControllerMock(overrides?: Partial<MatchControllerContract>): ControllerMock {
  return {
    createMatch: vi.fn(overrides?.createMatch ?? (async () => ({
      id: "match-1",
      sport: "Football",
      dateTime: new Date(),
      location: "Stadium",
      maxPlayers: 10,
      organizerId: "org-1",
      createdAt: new Date(),
    }))),
    listMatches: vi.fn(overrides?.listMatches ?? (async () => [])),
    getMatchById: vi.fn(overrides?.getMatchById ?? (async () => null)),
    updateMatch: vi.fn(overrides?.updateMatch ?? (async () => null)),
    deleteMatch: vi.fn(overrides?.deleteMatch ?? (async () => true)),
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
    await registerMatchRoutes(instance, { controller });
  });
  return app;
}

describe("Match routes", () => {
  it("creates a match", async () => {
    const controller = createControllerMock({
      createMatch: async (data) => ({
        id: "match-1",
        sport: data.sport,
        dateTime: data.dateTime,
        location: data.location,
        maxPlayers: data.maxPlayers,
        status: "OPEN" as any,
        organizerId: data.organizerId,
        cityId: data.cityId,
        courtId: null,
        createdAt: new Date(),
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/matches",
      payload: {
        sport: "Football",
        dateTime: "2026-03-01T10:00:00.000Z",
        location: "Stadium A",
        maxPlayers: 10,
        organizerId: "11111111-1111-4111-8111-111111111111",
        cityId: "22222222-2222-4222-8222-222222222222",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(controller.createMatch).toHaveBeenCalledWith({
      sport: "Football",
      dateTime: new Date("2026-03-01T10:00:00.000Z"),
      location: "Stadium A",
      maxPlayers: 10,
      organizerId: "11111111-1111-4111-8111-111111111111",
      cityId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("returns 404 when organizer not found", async () => {
    const controller = createControllerMock({
      createMatch: async () => {
        throw new Error("Organizer not found");
      },
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/matches",
      payload: {
        sport: "Football",
        dateTime: "2026-03-01T10:00:00.000Z",
        location: "Stadium A",
        maxPlayers: 10,
        organizerId: "99999999-9999-4999-8999-999999999999",
        cityId: "11111111-1111-4111-8111-111111111111",
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("lists all matches", async () => {
    const controller = createControllerMock({
      listMatches: async () => [
        {
          id: "match-1",
          sport: "Football",
          dateTime: new Date(),
          location: "Stadium A",
          maxPlayers: 10,
          organizerId: "org-1",
          createdAt: new Date(),
        },
        {
          id: "match-2",
          sport: "Basketball",
          dateTime: new Date(),
          location: "Court B",
          maxPlayers: 8,
          organizerId: "org-2",
          createdAt: new Date(),
        },
      ],
    });
    const app = await buildApp(controller);

    const response = await app.inject({ method: "GET", url: "/matches" });

    expect(response.statusCode).toBe(200);
    expect(controller.listMatches).toHaveBeenCalled();
    const body = JSON.parse(response.body);
    expect(body).toHaveLength(2);
  });

  it("filters matches by sport", async () => {
    const controller = createControllerMock({
      listMatches: async (filters) => {
        if (filters?.sport === "Football") {
          return [
            {
              id: "match-1",
              sport: "Football",
              dateTime: new Date(),
              location: "Stadium A",
              maxPlayers: 10,
              organizerId: "org-1",
              createdAt: new Date(),
            },
          ];
        }
        return [];
      },
    });
    const app = await buildApp(controller);

    const response = await app.inject({ method: "GET", url: "/matches?sport=Football" });

    expect(response.statusCode).toBe(200);
    expect(controller.listMatches).toHaveBeenCalledWith({ sport: "Football" });
  });

  it("filters matches by organizerId", async () => {
    const controller = createControllerMock({
      listMatches: async (filters) => {
        if (filters?.organizerId === "11111111-1111-4111-8111-111111111111") {
          return [
            {
              id: "match-1",
              sport: "Football",
              dateTime: new Date(),
              location: "Stadium A",
              maxPlayers: 10,
              organizerId: "11111111-1111-4111-8111-111111111111",
              createdAt: new Date(),
            },
          ];
        }
        return [];
      },
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "GET",
      url: "/matches?organizerId=11111111-1111-4111-8111-111111111111",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.listMatches).toHaveBeenCalledWith({
      organizerId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("gets match by id", async () => {
    const controller = createControllerMock({
      getMatchById: async () => ({
        id: "match-1",
        sport: "Football",
        dateTime: new Date(),
        location: "Stadium A",
        maxPlayers: 10,
        organizerId: "org-1",
        createdAt: new Date(),
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "GET",
      url: "/matches/22222222-2222-4222-8222-222222222222",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.getMatchById).toHaveBeenCalledWith("22222222-2222-4222-8222-222222222222");
  });

  it("returns 404 when match not found", async () => {
    const controller = createControllerMock({
      getMatchById: async () => null,
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "GET",
      url: "/matches/33333333-3333-4333-8333-333333333333",
    });

    expect(response.statusCode).toBe(404);
  });

  it("updates a match", async () => {
    const controller = createControllerMock({
      updateMatch: async (_id, data) => ({
        id: "match-1",
        sport: data.sport ?? "Football",
        dateTime: data.dateTime ?? new Date(),
        location: data.location ?? "Stadium A",
        maxPlayers: data.maxPlayers ?? 10,
        organizerId: "org-1",
        createdAt: new Date(),
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/matches/44444444-4444-4444-8444-444444444444",
      payload: { sport: "Basketball" },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateMatch).toHaveBeenCalledWith("44444444-4444-4444-8444-444444444444", {
      sport: "Basketball",
    });
  });

  it("returns 404 when updating non-existent match", async () => {
    const controller = createControllerMock({
      updateMatch: async () => null,
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/matches/55555555-5555-4555-8555-555555555555",
      payload: { sport: "Basketball" },
    });

    expect(response.statusCode).toBe(404);
  });

  it("deletes a match", async () => {
    const controller = createControllerMock({
      deleteMatch: async () => true,
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "DELETE",
      url: "/matches/66666666-6666-4666-8666-666666666666",
    });

    expect(response.statusCode).toBe(204);
    expect(controller.deleteMatch).toHaveBeenCalledWith("66666666-6666-4666-8666-666666666666");
  });

  it("returns 404 when deleting non-existent match", async () => {
    const controller = createControllerMock({
      deleteMatch: async () => false,
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "DELETE",
      url: "/matches/77777777-7777-4777-8777-777777777777",
    });

    expect(response.statusCode).toBe(404);
  });

  it("validates required sport on create", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/matches",
      payload: {
        sport: "",
        dateTime: "2026-03-01T10:00:00.000Z",
        location: "Stadium A",
        maxPlayers: 10,
        organizerId: "11111111-1111-4111-8111-111111111111",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("validates required location on create", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/matches",
      payload: {
        sport: "Football",
        dateTime: "2026-03-01T10:00:00.000Z",
        location: "",
        maxPlayers: 10,
        organizerId: "11111111-1111-4111-8111-111111111111",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("validates maxPlayers minimum value", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/matches",
      payload: {
        sport: "Football",
        dateTime: "2026-03-01T10:00:00.000Z",
        location: "Stadium A",
        maxPlayers: 0,
        organizerId: "11111111-1111-4111-8111-111111111111",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("validates datetime format", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/matches",
      payload: {
        sport: "Football",
        dateTime: "invalid-date",
        location: "Stadium A",
        maxPlayers: 10,
        organizerId: "11111111-1111-4111-8111-111111111111",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("validates organizerId UUID format", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/matches",
      payload: {
        sport: "Football",
        dateTime: "2026-03-01T10:00:00.000Z",
        location: "Stadium A",
        maxPlayers: 10,
        organizerId: "invalid-uuid",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("validates UUID format on GET", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "GET",
      url: "/matches/invalid-uuid",
    });

    expect(response.statusCode).toBe(400);
  });

  it("validates UUID format on PATCH", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/matches/not-a-uuid",
      payload: { sport: "Basketball" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("validates UUID format on DELETE", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "DELETE",
      url: "/matches/invalid",
    });

    expect(response.statusCode).toBe(400);
  });

  it("validates at least one field on update", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/matches/88888888-8888-4888-8888-888888888888",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it("updates only sport", async () => {
    const controller = createControllerMock({
      updateMatch: async (_id, data) => ({
        id: "match-1",
        sport: data.sport ?? "Football",
        dateTime: new Date(),
        location: "Stadium A",
        maxPlayers: 10,
        organizerId: "org-1",
        createdAt: new Date(),
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/matches/99999999-9999-4999-8999-999999999999",
      payload: { sport: "Basketball" },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateMatch).toHaveBeenCalledWith("99999999-9999-4999-8999-999999999999", {
      sport: "Basketball",
    });
  });

  it("updates only location", async () => {
    const controller = createControllerMock({
      updateMatch: async (_id, data) => ({
        id: "match-1",
        sport: "Football",
        dateTime: new Date(),
        location: data.location ?? "Stadium A",
        maxPlayers: 10,
        organizerId: "org-1",
        createdAt: new Date(),
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/matches/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      payload: { location: "Court B" },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateMatch).toHaveBeenCalledWith("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", {
      location: "Court B",
    });
  });

  it("updates only maxPlayers", async () => {
    const controller = createControllerMock({
      updateMatch: async (_id, data) => ({
        id: "match-1",
        sport: "Football",
        dateTime: new Date(),
        location: "Stadium A",
        maxPlayers: data.maxPlayers ?? 10,
        organizerId: "org-1",
        createdAt: new Date(),
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/matches/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      payload: { maxPlayers: 20 },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateMatch).toHaveBeenCalledWith("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", {
      maxPlayers: 20,
    });
  });

  it("updates only dateTime", async () => {
    const controller = createControllerMock({
      updateMatch: async (_id, data) => ({
        id: "match-1",
        sport: "Football",
        dateTime: data.dateTime ?? new Date(),
        location: "Stadium A",
        maxPlayers: 10,
        organizerId: "org-1",
        createdAt: new Date(),
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/matches/cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      payload: { dateTime: "2026-04-01T15:00:00.000Z" },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateMatch).toHaveBeenCalledWith("cccccccc-cccc-4ccc-8ccc-cccccccccccc", {
      dateTime: new Date("2026-04-01T15:00:00.000Z"),
    });
  });

  it("validates organizerId UUID in query params", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "GET",
      url: "/matches?organizerId=invalid-uuid",
    });

    expect(response.statusCode).toBe(400);
  });
});
