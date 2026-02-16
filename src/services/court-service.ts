import type { Prisma } from "../../generated/prisma/client";
import { container, TOKENS } from "../../lib/container";
import type { DatabaseClient } from "../../lib/prisma";

export type CreateCourtData = {
  name: string;
  clubId: string;
};

export type UpdateCourtData = {
  name?: string | undefined;
};

export class CourtService {
  private constructor(private readonly prisma: DatabaseClient) {}

  static resolve() {
    const prisma = container.resolve<DatabaseClient>(TOKENS.prisma);
    return new CourtService(prisma);
  }

  async createCourt(data: CreateCourtData) {
    const clubExists = await this.prisma.club.findUnique({
      where: { id: data.clubId },
    });

    if (!clubExists) {
      throw new Error("Club not found");
    }

    const payload: Prisma.CourtCreateInput = {
      name: data.name,
      club: {
        connect: { id: data.clubId },
      },
    };

    return this.prisma.court.create({
      data: payload,
      include: {
        club: true,
      },
    });
  }

  async listCourts(clubId?: string) {
    const where: Prisma.CourtWhereInput = {};
    if (clubId) {
      where.clubId = clubId;
    }

    return this.prisma.court.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        club: true,
      },
    });
  }

  async getCourtById(id: string) {
    return this.prisma.court.findUnique({
      where: { id },
      include: {
        club: true,
      },
    });
  }

  async updateCourt(id: string, data: UpdateCourtData) {
    const exists = await this.prisma.court.findUnique({ where: { id } });
    if (!exists) {
      return null;
    }

    const payload: Prisma.CourtUpdateInput = {};
    if (data.name !== undefined) {
      payload.name = data.name;
    }

    return this.prisma.court.update({
      where: { id },
      data: payload,
      include: {
        club: true,
      },
    });
  }

  async deleteCourt(id: string) {
    const exists = await this.prisma.court.findUnique({ where: { id } });
    if (!exists) {
      return false;
    }
    await this.prisma.court.delete({ where: { id } });
    return true;
  }
}
