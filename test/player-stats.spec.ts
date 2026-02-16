import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { ZodError } from "zod";
import { registerPlayerStatsRoutes } from "../src/routes/player-stats";
import type { PlayerStatsControllerContract } from "../src/controllers/player-stats-controller";
import type { PlayerStats } from "../generated/prisma/client";

const STATS_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

describe("PlayerStats Routes", () => {
  let app: FastifyInstance;
  let mockController: PlayerStatsControllerContract;

  const mockStats: any = {
    id: STATS_ID,
    userId: USER_ID,
    sport: "VOLEI",
    matchesPlayed: 10,
    wins: 7,
    losses: 3,
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
      createPlayerStats: vi.fn(),
      listPlayerStats: vi.fn(),
      getPlayerStatsById: vi.fn(),
      updatePlayerStats: vi.fn(),
      deletePlayerStats: vi.fn(),
    };

    await registerPlayerStatsRoutes(app, { controller: mockController });
  });

  describe("POST /player-stats", () => {
    it("should create player stats", async () => {
      vi.mocked(mockController.createPlayerStats).mockResolvedValue(mockStats);

      const response = await app.inject({
        method: "POST",
        url: "/player-stats",
        payload: {
          userId: USER_ID,
          sport: "VOLEI",
          matchesPlayed: 10,
          wins: 7,
          losses: 3,
        },
      });

      expect(response.statusCode).toBe(201);
      const result = response.json();
      expect(result.userId).toBe(mockStats.userId);
      expect(result.sport).toBe(mockStats.sport);
    });

    it("should return 404 when user not found", async () => {
      vi.mocked(mockController.createPlayerStats).mockRejectedValue(
        new Error("User not found")
      );

      const response = await app.inject({
        method: "POST",
        url: "/player-stats",
        payload: {
          userId: "99999999-9999-4999-8999-999999999999",
          sport: "VOLEI",
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /player-stats", () => {
    it("should list all player stats", async () => {
      const stats = [mockStats];
      vi.mocked(mockController.listPlayerStats).mockResolvedValue(stats);

      const response = await app.inject({
        method: "GET",
        url: "/player-stats",
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockStats.id);
    });

    it("should filter by userId", async () => {
      const stats = [mockStats];
      vi.mocked(mockController.listPlayerStats).mockResolvedValue(stats);

      const response = await app.inject({
        method: "GET",
        url: `/player-stats?userId=${USER_ID}`,
      });

      expect(response.statusCode).toBe(200);
      expect(mockController.listPlayerStats).toHaveBeenCalledWith(USER_ID, undefined);
    });

    it("should filter by sport", async () => {
      const stats = [mockStats];
      vi.mocked(mockController.listPlayerStats).mockResolvedValue(stats);

      const response = await app.inject({
        method: "GET",
        url: "/player-stats?sport=VOLEI",
      });

      expect(response.statusCode).toBe(200);
      expect(mockController.listPlayerStats).toHaveBeenCalledWith(undefined, "VOLEI");
    });
  });

  describe("GET /player-stats/:id", () => {
    it("should get player stats by id", async () => {
      vi.mocked(mockController.getPlayerStatsById).mockResolvedValue(mockStats);

      const response = await app.inject({
        method: "GET",
        url: `/player-stats/${STATS_ID}`,
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.id).toBe(mockStats.id);
    });

    it("should return 404 when stats not found", async () => {
      vi.mocked(mockController.getPlayerStatsById).mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: `/player-stats/${STATS_ID}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("PATCH /player-stats/:id", () => {
    it("should update player stats", async () => {
      const updatedStats = { ...mockStats, wins: 8 };
      vi.mocked(mockController.updatePlayerStats).mockResolvedValue(updatedStats);

      const response = await app.inject({
        method: "PATCH",
        url: `/player-stats/${STATS_ID}`,
        payload: {
          wins: 8,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.wins).toBe(8);
    });

    it("should return 404 when stats not found", async () => {
      vi.mocked(mockController.updatePlayerStats).mockResolvedValue(null);

      const response = await app.inject({
        method: "PATCH",
        url: `/player-stats/${STATS_ID}`,
        payload: {
          wins: 8,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("DELETE /player-stats/:id", () => {
    it("should delete player stats", async () => {
      vi.mocked(mockController.deletePlayerStats).mockResolvedValue(true);

      const response = await app.inject({
        method: "DELETE",
        url: `/player-stats/${STATS_ID}`,
      });

      expect(response.statusCode).toBe(204);
    });

    it("should return 404 when stats not found", async () => {
      vi.mocked(mockController.deletePlayerStats).mockResolvedValue(false);

      const response = await app.inject({
        method: "DELETE",
        url: `/player-stats/${STATS_ID}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
