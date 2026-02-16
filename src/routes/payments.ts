import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  PaymentController,
  type PaymentControllerContract,
} from "../controllers/payment-controller";
import type { CreatePaymentData, UpdatePaymentData } from "../services/payment-service";

const createPaymentSchema = z.object({
  matchId: z.string().uuid("Invalid match id"),
  userId: z.string().uuid("Invalid user id"),
  amount: z.number().positive("Amount must be positive"),
  status: z.string().optional(),
  provider: z.string().optional(),
});

const updatePaymentSchema = z
  .object({
    amount: z.number().positive("Amount must be positive").optional(),
    status: z.string().optional(),
    provider: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const idParamSchema = z.object({
  id: z.string().uuid("Invalid payment id"),
});

const paymentQuerySchema = z.object({
  matchId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: z.string().optional(),
});

type RegisterPaymentRoutesDeps = {
  controller?: PaymentControllerContract;
};

export async function registerPaymentRoutes(
  app: FastifyInstance,
  deps?: RegisterPaymentRoutesDeps,
) {
  const controller = deps?.controller ?? PaymentController.resolve();

  app.post("/payments", async (request, reply) => {
    const data = createPaymentSchema.parse(request.body) as CreatePaymentData;

    try {
      const payment = await controller.createPayment(data);
      return reply.code(201).send(payment);
    } catch (error) {
      if (error instanceof Error && 
          (error.message === "Match not found" || error.message === "User not found")) {
        return reply.code(404).send({ message: error.message });
      }
      throw error;
    }
  });

  app.get("/payments", async (request, reply) => {
    const query = paymentQuerySchema.parse(request.query);
    const payments = await controller.listPayments(query.matchId, query.userId, query.status);
    return reply.send(payments);
  });

  app.get("/payments/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const payment = await controller.getPaymentById(id);
    if (!payment) {
      return reply.code(404).send({ message: "Payment not found" });
    }
    return reply.send(payment);
  });

  app.patch("/payments/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const data = updatePaymentSchema.parse(request.body) as UpdatePaymentData;

    const payment = await controller.updatePayment(id, data);
    if (!payment) {
      return reply.code(404).send({ message: "Payment not found" });
    }
    return reply.send(payment);
  });

  app.delete("/payments/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const deleted = await controller.deletePayment(id);
    if (!deleted) {
      return reply.code(404).send({ message: "Payment not found" });
    }
    return reply.code(204).send();
  });
}
