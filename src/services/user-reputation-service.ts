import type { Prisma } from "../../generated/prisma/client";
import { container, TOKENS } from "../../lib/container";
import type { DatabaseClient } from "../../lib/prisma";

export type CreateUserReputationData = {
  userId: string;
  noShows?: number;
  cancellations?: number;
};

export type UpdateUserReputationData = {
  noShows?: number;
  cancellations?: number;
};

export class UserReputationService {
  private constructor(private readonly prisma: DatabaseClient) {}

  static resolve() {
    const prisma = container.resolve<DatabaseClient>(TOKENS.prisma);
    return new UserReputationService(prisma);
  }

  async createUserReputation(data: CreateUserReputationData) {
    const userExists = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!userExists) {
      throw new Error("User not found");
    }

    const existingReputation = await this.prisma.userReputation.findUnique({
      where: { userId: data.userId },
    });

    if (existingReputation) {
      throw new Error("User reputation already exists");
    }

    const payload: Prisma.UserReputationCreateInput = {
      noShows: data.noShows ?? 0,
      cancellations: data.cancellations ?? 0,
      user: {
        connect: { id: data.userId },
      },
    };

    return this.prisma.userReputation.create({
      data: payload,
      include: {
        user: true,
      },
    });
  }

  async listUserReputations() {
    return this.prisma.userReputation.findMany({
      include: {
        user: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async getUserReputationById(id: string) {
    return this.prisma.userReputation.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  }

  async getUserReputationByUserId(userId: string) {
    return this.prisma.userReputation.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });
  }

  async updateUserReputation(id: string, data: UpdateUserReputationData) {
    const exists = await this.prisma.userReputation.findUnique({ where: { id } });
    if (!exists) {
      return null;
    }

    const payload: Prisma.UserReputationUpdateInput = {};
    if (data.noShows !== undefined) {
      payload.noShows = data.noShows;
    }
    if (data.cancellations !== undefined) {
      payload.cancellations = data.cancellations;
    }

    return this.prisma.userReputation.update({
      where: { id },
      data: payload,
      include: {
        user: true,
      },
    });
  }

  async deleteUserReputation(id: string) {
    const exists = await this.prisma.userReputation.findUnique({ where: { id } });
    if (!exists) {
      return false;
    }
    await this.prisma.userReputation.delete({ where: { id } });
    return true;
  }
}
