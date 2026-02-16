import type { Prisma } from "../../generated/prisma/client";
import { container, TOKENS } from "../../lib/container";
import type { DatabaseClient } from "../../lib/prisma";

export type CreateMatchData = {
  sport: string;
  dateTime: Date;
  location: string;
  maxPlayers: number;
  organizerId: string;
};

export type UpdateMatchData = {
  sport?: string | undefined;
  dateTime?: Date | undefined;
  location?: string | undefined;
  maxPlayers?: number | undefined;
};

export type MatchFilters = {
  sport?: string;
  organizerId?: string;
};

export class MatchService {
  private constructor(private readonly prisma: DatabaseClient) {}

  static resolve() {
    const prisma = container.resolve<DatabaseClient>(TOKENS.prisma);
    return new MatchService(prisma);
  }

  async createMatch(data: CreateMatchData) {
    const organizerExists = await this.prisma.user.findUnique({
      where: { id: data.organizerId },
    });

    if (!organizerExists) {
      throw new Error("Organizer not found");
    }

    const payload: Prisma.MatchCreateInput = {
      sport: data.sport,
      dateTime: data.dateTime,
      location: data.location,
      maxPlayers: data.maxPlayers,
      organizer: {
        connect: { id: data.organizerId },
      },
    };

    return this.prisma.match.create({ data: payload });
  }

  async listMatches(filters?: MatchFilters) {
    const where: Prisma.MatchWhereInput = {};

    if (filters?.sport) {
      where.sport = filters.sport;
    }

    if (filters?.organizerId) {
      where.organizerId = filters.organizerId;
    }

    return this.prisma.match.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        organizer: true,
        participants: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async getMatchById(id: string) {
    return this.prisma.match.findUnique({
      where: { id },
      include: {
        organizer: true,
        participants: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async updateMatch(id: string, data: UpdateMatchData) {
    const exists = await this.prisma.match.findUnique({ where: { id } });
    if (!exists) {
      return null;
    }

    const payload: Prisma.MatchUpdateInput = {};
    if (data.sport !== undefined) {
      payload.sport = data.sport;
    }
    if (data.dateTime !== undefined) {
      payload.dateTime = data.dateTime;
    }
    if (data.location !== undefined) {
      payload.location = data.location;
    }
    if (data.maxPlayers !== undefined) {
      payload.maxPlayers = data.maxPlayers;
    }

    return this.prisma.match.update({ where: { id }, data: payload });
  }

  async deleteMatch(id: string) {
    const exists = await this.prisma.match.findUnique({ where: { id } });
    if (!exists) {
      return false;
    }
    await this.prisma.match.delete({ where: { id } });
    return true;
  }
}
