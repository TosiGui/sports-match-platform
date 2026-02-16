import { PaymentStatus, type Prisma } from "../../generated/prisma/client";
import { container, TOKENS } from "../../lib/container";
import type { DatabaseClient } from "../../lib/prisma";

export type CreatePaymentData = {
  matchId: string;
  userId: string;
  amount: number;
  status?: PaymentStatus;
  provider?: string;
};

export type UpdatePaymentData = {
  amount?: number;
  status?: PaymentStatus;
  provider?: string;
};

export class PaymentService {
  private constructor(private readonly prisma: DatabaseClient) {}

  static resolve() {
    const prisma = container.resolve<DatabaseClient>(TOKENS.prisma);
    return new PaymentService(prisma);
  }

  async createPayment(data: CreatePaymentData) {
    const matchExists = await this.prisma.match.findUnique({
      where: { id: data.matchId },
    });

    if (!matchExists) {
      throw new Error("Match not found");
    }

    const userExists = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!userExists) {
      throw new Error("User not found");
    }

    const payload: Prisma.PaymentCreateInput = {
      amount: data.amount,
      status: PaymentStatus.PENDING,
      provider: data.provider ?? null,
      match: {
        connect: { id: data.matchId },
      },
      user: {
        connect: { id: data.userId },
      },
    };

    return this.prisma.payment.create({
      data: payload,
      include: {
        match: true,
        user: true,
      },
    });
  }

  async listPayments(matchId?: string, userId?: string, status?: PaymentStatus) {
    const where: Prisma.PaymentWhereInput = {};
    if (matchId) {
      where.matchId = matchId;
    }
    if (userId) {
      where.userId = userId;
    }
    if (status) {
      where.status = status;
    }

    return this.prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        match: true,
        user: true,
      },
    });
  }

  async getPaymentById(id: string) {
    return this.prisma.payment.findUnique({
      where: { id },
      include: {
        match: true,
        user: true,
      },
    });
  }

  async updatePayment(id: string, data: UpdatePaymentData) {
    const exists = await this.prisma.payment.findUnique({ where: { id } });
    if (!exists) {
      return null;
    }

    const payload: Prisma.PaymentUpdateInput = {};
    if (data.amount !== undefined) {
      payload.amount = data.amount;
    }
    if (data.status !== undefined) {
      payload.status = data.status;
    }
    if (data.provider !== undefined) {
      payload.provider = data.provider ?? null;
    }

    return this.prisma.payment.update({
      where: { id },
      data: payload,
      include: {
        match: true,
        user: true,
      },
    });
  }

  async deletePayment(id: string) {
    const exists = await this.prisma.payment.findUnique({ where: { id } });
    if (!exists) {
      return false;
    }
    await this.prisma.payment.delete({ where: { id } });
    return true;
  }
}
