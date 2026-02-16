import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { ZodError } from "zod";
import { registerUserReputationRoutes } from "../src/routes/user-reputations";
import type { UserReputationControllerContract } from "../src/controllers/user-reputation-controller";
import type { UserReputation } from "../generated/prisma/client";

const REPUTATION_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

describe("UserReputation Routes", () => {
  let app: FastifyInstance;
  let mockController: UserReputationControllerContract;

  const mockReputation: any = {
    id: REPUTATION_ID,
    userId: USER_ID,
    noShows: 2,
    cancellations: 1,
    updatedAt: new Date(),
    user: {
      id: USER_ID,
      name: "John Doe",
      phone: null,
      email: null,
      createdAt: new Date(),
    },
  };

  beforeEach(async () => {
    app = Fastify();
    app.setErrorHandler((error, _request, reply) => {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          message: "Validation error",
          issues: error.issues,
        });
      }
      return reply.code(500).send({ message: "Internal server error" });
    });

    mockController = {
      createUserReputation: vi.fn(),
      listUserReputations: vi.fn(),
      getUserReputationById: vi.fn(),
      getUserReputationByUserId: vi.fn(),
      updateUserReputation: vi.fn(),
      deleteUserReputation: vi.fn(),
    };

    await registerUserReputationRoutes(app, { controller: mockController });
  });

  describe("POST /user-reputations", () => {
    it("should create user reputation", async () => {
      vi.mocked(mockController.createUserReputation).mockResolvedValue(mockReputation);

      const response = await app.inject({
        method: "POST",
        url: "/user-reputations",
        payload: {
          userId: USER_ID,
          noShows: 2,
          cancellations: 1,
        },
      });

      expect(response.statusCode).toBe(201);
      const result = response.json();
      expect(result.id).toBe(mockReputation.id);
      expect(result.userId).toBe(mockReputation.userId);
      expect(result.noShows).toBe(mockReputation.noShows);
      expect(result.cancellations).toBe(mockReputation.cancellations);
    });

    it("should return 404 when user not found", async () => {
      vi.mocked(mockController.createUserReputation).mockRejectedValue(
        new Error("User not found")
      );

      const response = await app.inject({
        method: "POST",
        url: "/user-reputations",
        payload: {
          userId: "99999999-9999-4999-8999-999999999999",
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 409 when reputation already exists", async () => {
      vi.mocked(mockController.createUserReputation).mockRejectedValue(
        new Error("User reputation already exists")
      );

      const response = await app.inject({
        method: "POST",
        url: "/user-reputations",
        payload: {
          userId: USER_ID,
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe("GET /user-reputations", () => {
    it("should list all user reputations", async () => {
      const reputations = [mockReputation];
      vi.mocked(mockController.listUserReputations).mockResolvedValue(reputations);

      const response = await app.inject({
        method: "GET",
        url: "/user-reputations",
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockReputation.id);
    });
  });

  describe("GET /user-reputations/:id", () => {
    it("should get reputation by id", async () => {
      vi.mocked(mockController.getUserReputationById).mockResolvedValue(mockReputation);

      const response = await app.inject({
        method: "GET",
        url: `/user-reputations/${REPUTATION_ID}`,
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.id).toBe(mockReputation.id);
    });

    it("should return 404 when reputation not found", async () => {
      vi.mocked(mockController.getUserReputationById).mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: `/user-reputations/${REPUTATION_ID}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /user-reputations/user/:userId", () => {
    it("should get reputation by user id", async () => {
      vi.mocked(mockController.getUserReputationByUserId).mockResolvedValue(mockReputation);

      const response = await app.inject({
        method: "GET",
        url: `/user-reputations/user/${USER_ID}`,
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.userId).toBe(mockReputation.userId);
    });

    it("should return 404 when reputation not found", async () => {
      vi.mocked(mockController.getUserReputationByUserId).mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: `/user-reputations/user/${USER_ID}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("PATCH /user-reputations/:id", () => {
    it("should update reputation", async () => {
      const updatedReputation = { ...mockReputation, noShows: 3 };
      vi.mocked(mockController.updateUserReputation).mockResolvedValue(updatedReputation);

      const response = await app.inject({
        method: "PATCH",
        url: `/user-reputations/${REPUTATION_ID}`,
        payload: {
          noShows: 3,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.noShows).toBe(3);
    });

    it("should return 404 when reputation not found", async () => {
      vi.mocked(mockController.updateUserReputation).mockResolvedValue(null);

      const response = await app.inject({
        method: "PATCH",
        url: `/user-reputations/${REPUTATION_ID}`,
        payload: {
          noShows: 3,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("DELETE /user-reputations/:id", () => {
    it("should delete reputation", async () => {
      vi.mocked(mockController.deleteUserReputation).mockResolvedValue(true);

      const response = await app.inject({
        method: "DELETE",
        url: `/user-reputations/${REPUTATION_ID}`,
      });

      expect(response.statusCode).toBe(204);
    });

    it("should return 404 when reputation not found", async () => {
      vi.mocked(mockController.deleteUserReputation).mockResolvedValue(false);

      const response = await app.inject({
        method: "DELETE",
        url: `/user-reputations/${REPUTATION_ID}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
