import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { ZodError } from "zod";
import { registerCourtRoutes } from "../src/routes/courts";
import type { CourtControllerContract } from "../src/controllers/court-controller";
import type { Court } from "../generated/prisma/client";

const COURT_ID = "11111111-1111-4111-8111-111111111111";
const CLUB_ID = "22222222-2222-4222-8222-222222222222";
const CITY_ID = "33333333-3333-4333-8333-333333333333";
const USER_ID = "44444444-4444-4444-8444-444444444444";

describe("Court Routes", () => {
  let app: FastifyInstance;
  let mockController: CourtControllerContract;

  const mockCourt: any = {
    id: COURT_ID,
    name: "Court 1",
    clubId: CLUB_ID,
    createdAt: new Date(),
    club: {
      id: CLUB_ID,
      name: "Arena Sports",
      cityId: CITY_ID,
      ownerId: USER_ID,
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
      createCourt: vi.fn(),
      listCourts: vi.fn(),
      getCourtById: vi.fn(),
      updateCourt: vi.fn(),
      deleteCourt: vi.fn(),
    };

    await registerCourtRoutes(app, { controller: mockController });
  });

  describe("POST /courts", () => {
    it("should create a court", async () => {
      vi.mocked(mockController.createCourt).mockResolvedValue(mockCourt);

      const response = await app.inject({
        method: "POST",
        url: "/courts",
        payload: {
          name: "Court 1",
          clubId: CLUB_ID,
        },
      });

      expect(response.statusCode).toBe(201);
      const result = response.json();
      expect(result.id).toBe(mockCourt.id);
      expect(result.name).toBe(mockCourt.name);
    });

    it("should return 404 when club not found", async () => {
      vi.mocked(mockController.createCourt).mockRejectedValue(
        new Error("Club not found")
      );

      const response = await app.inject({
        method: "POST",
        url: "/courts",
        payload: {
          name: "Court 1",
          clubId: "99999999-9999-4999-8999-999999999999",
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /courts", () => {
    it("should list all courts", async () => {
      const courts = [mockCourt];
      vi.mocked(mockController.listCourts).mockResolvedValue(courts);

      const response = await app.inject({
        method: "GET",
        url: "/courts",
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockCourt.id);
    });

    it("should filter courts by club", async () => {
      const courts = [mockCourt];
      vi.mocked(mockController.listCourts).mockResolvedValue(courts);

      const response = await app.inject({
        method: "GET",
        url: `/courts?clubId=${CLUB_ID}`,
      });

      expect(response.statusCode).toBe(200);
      expect(mockController.listCourts).toHaveBeenCalledWith(CLUB_ID);
    });
  });

  describe("GET /courts/:id", () => {
    it("should get a court by id", async () => {
      vi.mocked(mockController.getCourtById).mockResolvedValue(mockCourt);

      const response = await app.inject({
        method: "GET",
        url: `/courts/${COURT_ID}`,
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.id).toBe(mockCourt.id);
    });

    it("should return 404 when court not found", async () => {
      vi.mocked(mockController.getCourtById).mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: `/courts/${COURT_ID}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("PATCH /courts/:id", () => {
    it("should update a court", async () => {
      const updatedCourt = { ...mockCourt, name: "Court 2" };
      vi.mocked(mockController.updateCourt).mockResolvedValue(updatedCourt);

      const response = await app.inject({
        method: "PATCH",
        url: `/courts/${COURT_ID}`,
        payload: {
          name: "Court 2",
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.name).toBe("Court 2");
    });

    it("should return 404 when court not found", async () => {
      vi.mocked(mockController.updateCourt).mockResolvedValue(null);

      const response = await app.inject({
        method: "PATCH",
        url: `/courts/${COURT_ID}`,
        payload: {
          name: "Court 2",
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("DELETE /courts/:id", () => {
    it("should delete a court", async () => {
      vi.mocked(mockController.deleteCourt).mockResolvedValue(true);

      const response = await app.inject({
        method: "DELETE",
        url: `/courts/${COURT_ID}`,
      });

      expect(response.statusCode).toBe(204);
    });

    it("should return 404 when court not found", async () => {
      vi.mocked(mockController.deleteCourt).mockResolvedValue(false);

      const response = await app.inject({
        method: "DELETE",
        url: `/courts/${COURT_ID}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
