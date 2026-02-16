import type { Prisma } from "../../generated/prisma/client";
import { container, TOKENS } from "../../lib/container";
import type { DatabaseClient } from "../../lib/prisma";

export type CreateClubData = {
  name: string;
  cityId: string;
  ownerId: string;
};

export type UpdateClubData = {
  name?: string | undefined;
  cityId?: string | undefined;
  ownerId?: string | undefined;
};

export class ClubService {
  private constructor(private readonly prisma: DatabaseClient) {}

  static resolve() {
    const prisma = container.resolve<DatabaseClient>(TOKENS.prisma);
    return new ClubService(prisma);
  }

  async createClub(data: CreateClubData) {
    const cityExists = await this.prisma.city.findUnique({
      where: { id: data.cityId },
    });

    if (!cityExists) {
      throw new Error("City not found");
    }

    const ownerExists = await this.prisma.user.findUnique({
      where: { id: data.ownerId },
    });

    if (!ownerExists) {
      throw new Error("Owner not found");
    }

    const payload: Prisma.ClubCreateInput = {
      name: data.name,
      city: {
        connect: { id: data.cityId },
      },
      owner: {
        connect: { id: data.ownerId },
      },
    };

    return this.prisma.club.create({ 
      data: payload,
      include: {
        city: true,
        owner: true,
      },
    });
  }

  async listClubs(cityId?: string) {
    const where: Prisma.ClubWhereInput = {};
    if (cityId) {
      where.cityId = cityId;
    }

    return this.prisma.club.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        city: true,
        owner: true,
      },
    });
  }

  async getClubById(id: string) {
    return this.prisma.club.findUnique({
      where: { id },
      include: {
        city: true,
        owner: true,
        courts: true,
      },
    });
  }

  async updateClub(id: string, data: UpdateClubData) {
    const exists = await this.prisma.club.findUnique({ where: { id } });
    if (!exists) {
      return null;
    }

    if (data.cityId) {
      const cityExists = await this.prisma.city.findUnique({
        where: { id: data.cityId },
      });

      if (!cityExists) {
        throw new Error("City not found");
      }
    }

    if (data.ownerId) {
      const ownerExists = await this.prisma.user.findUnique({
        where: { id: data.ownerId },
      });

      if (!ownerExists) {
        throw new Error("Owner not found");
      }
    }

    const payload: Prisma.ClubUpdateInput = {};
    if (data.name !== undefined) {
      payload.name = data.name;
    }
    if (data.cityId !== undefined) {
      payload.city = {
        connect: { id: data.cityId },
      };
    }
    if (data.ownerId !== undefined) {
      payload.owner = {
        connect: { id: data.ownerId },
      };
    }

    return this.prisma.club.update({
      where: { id },
      data: payload,
      include: {
        city: true,
        owner: true,
      },
    });
  }

  async deleteClub(id: string) {
    const exists = await this.prisma.club.findUnique({ where: { id } });
    if (!exists) {
      return false;
    }
    await this.prisma.club.delete({ where: { id } });
    return true;
  }
}
