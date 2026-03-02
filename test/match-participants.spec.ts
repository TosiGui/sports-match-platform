import Fastify from "fastify";
import { ZodError } from "zod";
import { describe, expect, it, vi } from "vitest";
import type { MatchParticipantControllerContract } from "../src/controllers/match-participant-controller";
import { registerMatchParticipantRoutes } from "../src/routes/match-participants";

type ControllerMock = MatchParticipantControllerContract & {
  joinMatch: ReturnType<typeof vi.fn>;
  listParticipantsByMatch: ReturnType<typeof vi.fn>;
  updateParticipantStatus: ReturnType<typeof vi.fn>;
  leaveMatch: ReturnType<typeof vi.fn>;
};

function createControllerMock(overrides?: Partial<MatchParticipantControllerContract>): ControllerMock {
  return {
    joinMatch: vi.fn(overrides?.joinMatch ?? (async () => ({
      id: "participant-1",
      matchId: "match-1",
      userId: "user-1",
      status: "PENDING" as any,
      joinedAt: new Date(),
    }))),
    listParticipantsByMatch: vi.fn(overrides?.listParticipantsByMatch ?? (async () => [])),
    updateParticipantStatus: vi.fn(overrides?.updateParticipantStatus ?? (async () => null)),
    leaveMatch: vi.fn(overrides?.leaveMatch ?? (async () => true)),
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
    await registerMatchParticipantRoutes(instance, { controller });
  });
  return app;
}

describe("MatchParticipant routes", () => {
  it("adds participant to match", async () => {
    const controller = createControllerMock({
      joinMatch: async (data) => ({
        id: "participant-1",
        matchId: data.matchId,
        userId: data.userId,
        status: data.status,
        joinedAt: new Date(),
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/matches/11111111-1111-4111-8111-111111111111/participants",
      payload: {
        userId: "22222222-2222-4222-8222-222222222222",
        status: "pending",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(controller.joinMatch).toHaveBeenCalledWith({
      matchId: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
      status: "PENDING",
    });
  });

  it("returns 404 when match not found", async () => {
    const controller = createControllerMock({
      joinMatch: async () => {
        throw new Error("Match not found");
      },
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/matches/99999999-9999-4999-8999-999999999999/participants",
      payload: {
        userId: "22222222-2222-4222-8222-222222222222",
        status: "pending",
      },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Match not found");
  });

  it("returns 404 when user not found", async () => {
    const controller = createControllerMock({
      joinMatch: async () => {
        throw new Error("User not found");
      },
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/matches/11111111-1111-4111-8111-111111111111/participants",
      payload: {
        userId: "99999999-9999-4999-8999-999999999999",
        status: "pending",
      },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("User not found");
  });

  it("returns 409 when user already joined", async () => {
    const controller = createControllerMock({
      joinMatch: async () => {
        throw new Error("User already joined this match");
      },
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/matches/11111111-1111-4111-8111-111111111111/participants",
      payload: {
        userId: "22222222-2222-4222-8222-222222222222",
        status: "pending",
      },
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("User already joined this match");
  });

  it("returns 409 when match is full", async () => {
    const controller = createControllerMock({
      joinMatch: async () => {
        throw new Error("Match is full");
      },
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/matches/11111111-1111-4111-8111-111111111111/participants",
      payload: {
        userId: "22222222-2222-4222-8222-222222222222",
        status: "confirmed",
      },
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Match is full");
  });

  it("lists participants by match", async () => {
    const controller = createControllerMock({
      listParticipantsByMatch: async () => [
        {
          id: "participant-1",
          matchId: "11111111-1111-4111-8111-111111111111",
          userId: "user-1",
          status: "CONFIRMED" as any,
          joinedAt: new Date(),
        },
        {
          id: "participant-2",
          matchId: "11111111-1111-4111-8111-111111111111",
          userId: "user-2",
          status: "PENDING" as any,
          joinedAt: new Date(),
        },
      ],
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "GET",
      url: "/matches/11111111-1111-4111-8111-111111111111/participants",
    });

    expect(response.statusCode).toBe(200);
    expect(controller.listParticipantsByMatch).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111"
    );
    const body = JSON.parse(response.body);
    expect(body).toHaveLength(2);
  });

  it("updates participant status", async () => {
    const controller = createControllerMock({
      updateParticipantStatus: async (_id, data) => ({
        id: "participant-1",
        matchId: "match-1",
        userId: "user-1",
        status: data.status,
        joinedAt: new Date(),
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/participants/33333333-3333-4333-8333-333333333333/status",
      payload: { status: "confirmed" },
    });

    expect(response.statusCode).toBe(200);
    expect(controller.updateParticipantStatus).toHaveBeenCalledWith(
      "33333333-3333-4333-8333-333333333333",
      { status: "CONFIRMED" }
    );
  });

  it("returns 404 when updating non-existent participant", async () => {
    const controller = createControllerMock({
      updateParticipantStatus: async () => null,
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/participants/44444444-4444-4444-8444-444444444444/status",
      payload: { status: "confirmed" },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Participant not found");
  });

  it("returns 409 when updating status but match is full", async () => {
    const controller = createControllerMock({
      updateParticipantStatus: async () => {
        throw new Error("Match is full");
      },
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/participants/55555555-5555-4555-8555-555555555555/status",
      payload: { status: "confirmed" },
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Match is full");
  });

  it("removes participant from match", async () => {
    const controller = createControllerMock({
      leaveMatch: async () => true,
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "DELETE",
      url: "/matches/11111111-1111-4111-8111-111111111111/participants/22222222-2222-4222-8222-222222222222",
    });

    expect(response.statusCode).toBe(204);
    expect(controller.leaveMatch).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222"
    );
  });

  it("returns 404 when removing non-existent participant", async () => {
    const controller = createControllerMock({
      leaveMatch: async () => false,
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "DELETE",
      url: "/matches/11111111-1111-4111-8111-111111111111/participants/99999999-9999-4999-8999-999999999999",
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Participant not found");
  });

  it("validates userId UUID format", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/matches/11111111-1111-4111-8111-111111111111/participants",
      payload: {
        userId: "invalid-uuid",
        status: "pending",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("validates matchId UUID format on POST", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/matches/invalid-match-id/participants",
      payload: {
        userId: "22222222-2222-4222-8222-222222222222",
        status: "pending",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("validates matchId UUID format on GET", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "GET",
      url: "/matches/invalid-match-id/participants",
    });

    expect(response.statusCode).toBe(400);
  });

  it("validates participant id UUID format on PATCH", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/participants/invalid-id/status",
      payload: { status: "confirmed" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("validates userId UUID format on DELETE", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "DELETE",
      url: "/matches/11111111-1111-4111-8111-111111111111/participants/invalid-user",
    });

    expect(response.statusCode).toBe(400);
  });

  it("validates matchId UUID format on DELETE", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "DELETE",
      url: "/matches/invalid-match/participants/22222222-2222-4222-8222-222222222222",
    });

    expect(response.statusCode).toBe(400);
  });

  it("validates status enum values on join", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/matches/11111111-1111-4111-8111-111111111111/participants",
      payload: {
        userId: "22222222-2222-4222-8222-222222222222",
        status: "invalid-status",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("validates status enum values on update", async () => {
    const controller = createControllerMock();
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/participants/33333333-3333-4333-8333-333333333333/status",
      payload: { status: "invalid-status" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("accepts pending status", async () => {
    const controller = createControllerMock({
      joinMatch: async (data) => ({
        id: "participant-1",
        matchId: data.matchId,
        userId: data.userId,
        status: data.status,
        joinedAt: new Date(),
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/matches/11111111-1111-4111-8111-111111111111/participants",
      payload: {
        userId: "22222222-2222-4222-8222-222222222222",
        status: "pending",
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it("accepts confirmed status", async () => {
    const controller = createControllerMock({
      joinMatch: async (data) => ({
        id: "participant-1",
        matchId: data.matchId,
        userId: data.userId,
        status: data.status,
        joinedAt: new Date(),
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/matches/11111111-1111-4111-8111-111111111111/participants",
      payload: {
        userId: "22222222-2222-4222-8222-222222222222",
        status: "confirmed",
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it("accepts declined status", async () => {
    const controller = createControllerMock({
      joinMatch: async (data) => ({
        id: "participant-1",
        matchId: data.matchId,
        userId: data.userId,
        status: data.status,
        joinedAt: new Date(),
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "POST",
      url: "/matches/11111111-1111-4111-8111-111111111111/participants",
      payload: {
        userId: "22222222-2222-4222-8222-222222222222",
        status: "declined",
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it("updates status from pending to confirmed", async () => {
    const controller = createControllerMock({
      updateParticipantStatus: async (_id, data) => ({
        id: "participant-1",
        matchId: "match-1",
        userId: "user-1",
        status: data.status,
        joinedAt: new Date(),
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/participants/66666666-6666-4666-8666-666666666666/status",
      payload: { status: "confirmed" },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("confirmed");
  });

  it("updates status from confirmed to declined", async () => {
    const controller = createControllerMock({
      updateParticipantStatus: async (_id, data) => ({
        id: "participant-1",
        matchId: "match-1",
        userId: "user-1",
        status: data.status,
        joinedAt: new Date(),
      }),
    });
    const app = await buildApp(controller);

    const response = await app.inject({
      method: "PATCH",
      url: "/participants/77777777-7777-4777-8777-777777777777/status",
      payload: { status: "declined" },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("declined");
  });
});
