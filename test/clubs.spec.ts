import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { ZodError } from "zod";
import { registerClubRoutes } from "../src/routes/clubs";
import type { ClubControllerContract } from "../src/controllers/club-controller";
import type { Club } from "../generated/prisma/client";

const CLUB_ID = "11111111-1111-4111-8111-111111111111";
const CITY_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";

describe("Club Routes", () => {
  let app: FastifyInstance;
  let mockController: ClubControllerContract;

  const mockDate = new Date();
  const mockClub: any = {
    id: CLUB_ID,
    name: "Arena Sports",
    cityId: CITY_ID,
    ownerId: USER_ID,
    createdAt: mockDate,
    city: {
      id: CITY_ID,
      name: "São Paulo",
      state: "SP",
      createdAt: mockDate,
    },
    owner: {
      id: USER_ID,
      name: "John Doe",
      phone: null,
      email: null,
      createdAt: mockDate,
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
      createClub: vi.fn(),
      listClubs: vi.fn(),
      getClubById: vi.fn(),
      updateClub: vi.fn(),
      deleteClub: vi.fn(),
    };

    await registerClubRoutes(app, { controller: mockController });
  });

  describe("POST /clubs", () => {
    it("should create a club", async () => {
      vi.mocked(mockController.createClub).mockResolvedValue(mockClub);

      const response = await app.inject({
        method: "POST",
        url: "/clubs",
        payload: {
          name: "Arena Sports",
          cityId: CITY_ID,
          ownerId: USER_ID,
        },
      });

      expect(response.statusCode).toBe(201);
      const result = response.json();
      expect(result.id).toBe(mockClub.id);
      expect(result.name).toBe(mockClub.name);
    });

    it("should return 404 when city not found", async () => {
      vi.mocked(mockController.createClub).mockRejectedValue(
        new Error("City not found")
      );

      const response = await app.inject({
        method: "POST",
        url: "/clubs",
        payload: {
          name: "Arena Sports",
          cityId: "99999999-9999-4999-8999-999999999999",
          ownerId: USER_ID,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /clubs", () => {
    it("should list all clubs", async () => {
      const clubs = [mockClub];
      vi.mocked(mockController.listClubs).mockResolvedValue(clubs);

      const response = await app.inject({
        method: "GET",
        url: "/clubs",
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockClub.id);
    });

    it("should filter clubs by city", async () => {
      const clubs = [mockClub];
      vi.mocked(mockController.listClubs).mockResolvedValue(clubs);

      const response = await app.inject({
        method: "GET",
        url: `/clubs?cityId=${CITY_ID}`,
      });

      expect(response.statusCode).toBe(200);
      expect(mockController.listClubs).toHaveBeenCalledWith(CITY_ID);
    });
  });

  describe("GET /clubs/:id", () => {
    it("should get a club by id", async () => {
      vi.mocked(mockController.getClubById).mockResolvedValue(mockClub);

      const response = await app.inject({
        method: "GET",
        url: `/clubs/${CLUB_ID}`,
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.id).toBe(mockClub.id);
    });

    it("should return 404 when club not found", async () => {
      vi.mocked(mockController.getClubById).mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: `/clubs/${CLUB_ID}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("PATCH /clubs/:id", () => {
    it("should update a club", async () => {
      const updatedClub = { ...mockClub, name: "New Arena" };
      vi.mocked(mockController.updateClub).mockResolvedValue(updatedClub);

      const response = await app.inject({
        method: "PATCH",
        url: `/clubs/${CLUB_ID}`,
        payload: {
          name: "New Arena",
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.name).toBe("New Arena");
    });

    it("should return 404 when club not found", async () => {
      vi.mocked(mockController.updateClub).mockResolvedValue(null);

      const response = await app.inject({
        method: "PATCH",
        url: `/clubs/${CLUB_ID}`,
        payload: {
          name: "New Arena",
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("DELETE /clubs/:id", () => {
    it("should delete a club", async () => {
      vi.mocked(mockController.deleteClub).mockResolvedValue(true);

      const response = await app.inject({
        method: "DELETE",
        url: `/clubs/${CLUB_ID}`,
      });

      expect(response.statusCode).toBe(204);
    });

    it("should return 404 when club not found", async () => {
      vi.mocked(mockController.deleteClub).mockResolvedValue(false);

      const response = await app.inject({
        method: "DELETE",
        url: `/clubs/${CLUB_ID}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
