import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { ZodError } from "zod";
import { registerCityRoutes } from "../src/routes/cities";
import type { CityControllerContract } from "../src/controllers/city-controller";
import type { City } from "../generated/prisma/client";

const CITY_ID = "11111111-1111-4111-8111-111111111111";

describe("City Routes", () => {
  let app: FastifyInstance;
  let mockController: CityControllerContract;

  const mockCityDate = new Date();
  const mockCity: City = {
    id: CITY_ID,
    name: "São Paulo",
    state: "SP",
    createdAt: mockCityDate,
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
      console.error("Test server error", error);
      return reply.code(500).send({ message: "Internal server error" });
    });

    mockController = {
      createCity: vi.fn(),
      listCities: vi.fn(),
      getCityById: vi.fn(),
      updateCity: vi.fn(),
      deleteCity: vi.fn(),
    };

    await registerCityRoutes(app, { controller: mockController });
  });

  describe("POST /cities", () => {
    it("should create a city", async () => {
      vi.mocked(mockController.createCity).mockResolvedValue(mockCity);

      const response = await app.inject({
        method: "POST",
        url: "/cities",
        payload: {
          name: "São Paulo",
          state: "SP",
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({
        ...mockCity,
        createdAt: mockCityDate.toISOString(),
      });
      expect(mockController.createCity).toHaveBeenCalledWith({
        name: "São Paulo",
        state: "SP",
      });
    });

    it("should return 400 for invalid data", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/cities",
        payload: {
          name: "",
          state: "SP",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /cities", () => {
    it("should list all cities", async () => {
      const cities = [mockCity];
      vi.mocked(mockController.listCities).mockResolvedValue(cities);

      const response = await app.inject({
        method: "GET",
        url: "/cities",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([{
        ...mockCity,
        createdAt: mockCityDate.toISOString(),
      }]);
    });
  });

  describe("GET /cities/:id", () => {
    it("should get a city by id", async () => {
      vi.mocked(mockController.getCityById).mockResolvedValue(mockCity);

      const response = await app.inject({
        method: "GET",
        url: `/cities/${CITY_ID}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ...mockCity,
        createdAt: mockCityDate.toISOString(),
      });
    });

    it("should return 404 when city not found", async () => {
      vi.mocked(mockController.getCityById).mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: `/cities/${CITY_ID}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("PATCH /cities/:id", () => {
    it("should update a city", async () => {
      const updatedCity = { ...mockCity, name: "Rio de Janeiro" };
      vi.mocked(mockController.updateCity).mockResolvedValue(updatedCity);

      const response = await app.inject({
        method: "PATCH",
        url: `/cities/${CITY_ID}`,
        payload: {
          name: "Rio de Janeiro",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ...updatedCity,
        createdAt: mockCityDate.toISOString(),
      });
    });

    it("should return 404 when city not found", async () => {
      vi.mocked(mockController.updateCity).mockResolvedValue(null);

      const response = await app.inject({
        method: "PATCH",
        url: `/cities/${CITY_ID}`,
        payload: {
          name: "Rio de Janeiro",
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("DELETE /cities/:id", () => {
    it("should delete a city", async () => {
      vi.mocked(mockController.deleteCity).mockResolvedValue(true);

      const response = await app.inject({
        method: "DELETE",
        url: `/cities/${CITY_ID}`,
      });

      expect(response.statusCode).toBe(204);
    });

    it("should return 404 when city not found", async () => {
      vi.mocked(mockController.deleteCity).mockResolvedValue(false);

      const response = await app.inject({
        method: "DELETE",
        url: `/cities/${CITY_ID}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
