import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { ZodError } from "zod";
import { registerPaymentRoutes } from "../src/routes/payments";
import type { PaymentControllerContract } from "../src/controllers/payment-controller";
import type { Payment } from "../generated/prisma/client";

const PAYMENT_ID = "11111111-1111-4111-8111-111111111111";
const MATCH_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";
const CITY_ID = "44444444-4444-4444-8444-444444444444";

describe("Payment Routes", () => {
  let app: FastifyInstance;
  let mockController: PaymentControllerContract;

  const mockPayment: any = {
    id: PAYMENT_ID,
    matchId: MATCH_ID,
    userId: USER_ID,
    amount: 50.00,
    status: "PAID",
    provider: "PIX",
    createdAt: new Date(),
    match: {
      id: MATCH_ID,
      sport: "VOLEI",
      dateTime: new Date(),
      location: "Arena Sports",
      maxPlayers: 10,
      status: "OPEN",
      organizerId: USER_ID,
      cityId: CITY_ID,
      courtId: null,
      createdAt: new Date(),
    },
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
      createPayment: vi.fn(),
      listPayments: vi.fn(),
      getPaymentById: vi.fn(),
      updatePayment: vi.fn(),
      deletePayment: vi.fn(),
    };

    await registerPaymentRoutes(app, { controller: mockController });
  });

  describe("POST /payments", () => {
    it("should create a payment", async () => {
      vi.mocked(mockController.createPayment).mockResolvedValue(mockPayment);

      const response = await app.inject({
        method: "POST",
        url: "/payments",
        payload: {
          matchId: MATCH_ID,
          userId: USER_ID,
          amount: 50.00,
          status: "PAID",
          provider: "PIX",
        },
      });

      expect(response.statusCode).toBe(201);
      const result = response.json();
      expect(result.matchId).toBe(mockPayment.matchId);
      expect(result.userId).toBe(mockPayment.userId);
      expect(result.amount).toBe(mockPayment.amount);
    });

    it("should return 404 when match not found", async () => {
      vi.mocked(mockController.createPayment).mockRejectedValue(
        new Error("Match not found")
      );

      const response = await app.inject({
        method: "POST",
        url: "/payments",
        payload: {
          matchId: "99999999-9999-4999-8999-999999999999",
          userId: USER_ID,
          amount: 50.00,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 404 when user not found", async () => {
      vi.mocked(mockController.createPayment).mockRejectedValue(
        new Error("User not found")
      );

      const response = await app.inject({
        method: "POST",
        url: "/payments",
        payload: {
          matchId: MATCH_ID,
          userId: "99999999-9999-4999-8999-999999999999",
          amount: 50.00,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /payments", () => {
    it("should list all payments", async () => {
      const payments = [mockPayment];
      vi.mocked(mockController.listPayments).mockResolvedValue(payments);

      const response = await app.inject({
        method: "GET",
        url: "/payments",
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockPayment.id);
    });

    it("should filter by matchId", async () => {
      const payments = [mockPayment];
      vi.mocked(mockController.listPayments).mockResolvedValue(payments);

      const response = await app.inject({
        method: "GET",
        url: `/payments?matchId=${MATCH_ID}`,
      });

      expect(response.statusCode).toBe(200);
      expect(mockController.listPayments).toHaveBeenCalledWith(MATCH_ID, undefined, undefined);
    });

    it("should filter by userId", async () => {
      const payments = [mockPayment];
      vi.mocked(mockController.listPayments).mockResolvedValue(payments);

      const response = await app.inject({
        method: "GET",
        url: `/payments?userId=${USER_ID}`,
      });

      expect(response.statusCode).toBe(200);
      expect(mockController.listPayments).toHaveBeenCalledWith(undefined, USER_ID, undefined);
    });

    it("should filter by status", async () => {
      const payments = [mockPayment];
      vi.mocked(mockController.listPayments).mockResolvedValue(payments);

      const response = await app.inject({
        method: "GET",
        url: "/payments?status=PAID",
      });

      expect(response.statusCode).toBe(200);
      expect(mockController.listPayments).toHaveBeenCalledWith(undefined, undefined, "PAID");
    });
  });

  describe("GET /payments/:id", () => {
    it("should get payment by id", async () => {
      vi.mocked(mockController.getPaymentById).mockResolvedValue(mockPayment);

      const response = await app.inject({
        method: "GET",
        url: `/payments/${PAYMENT_ID}`,
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.id).toBe(mockPayment.id);
    });

    it("should return 404 when payment not found", async () => {
      vi.mocked(mockController.getPaymentById).mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: `/payments/${PAYMENT_ID}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("PATCH /payments/:id", () => {
    it("should update payment", async () => {
      const updatedPayment = { ...mockPayment, status: "REFUNDED" };
      vi.mocked(mockController.updatePayment).mockResolvedValue(updatedPayment);

      const response = await app.inject({
        method: "PATCH",
        url: `/payments/${PAYMENT_ID}`,
        payload: {
          status: "REFUNDED",
        },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.status).toBe("REFUNDED");
    });

    it("should return 404 when payment not found", async () => {
      vi.mocked(mockController.updatePayment).mockResolvedValue(null);

      const response = await app.inject({
        method: "PATCH",
        url: `/payments/${PAYMENT_ID}`,
        payload: {
          status: "REFUNDED",
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("DELETE /payments/:id", () => {
    it("should delete payment", async () => {
      vi.mocked(mockController.deletePayment).mockResolvedValue(true);

      const response = await app.inject({
        method: "DELETE",
        url: `/payments/${PAYMENT_ID}`,
      });

      expect(response.statusCode).toBe(204);
    });

    it("should return 404 when payment not found", async () => {
      vi.mocked(mockController.deletePayment).mockResolvedValue(false);

      const response = await app.inject({
        method: "DELETE",
        url: `/payments/${PAYMENT_ID}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
