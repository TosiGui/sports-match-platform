import { Sport, type Prisma } from "../../generated/prisma/client";
import { container, TOKENS } from "../../lib/container";
import type { DatabaseClient } from "../../lib/prisma";

export type CreatePlayerStatsData = {
  userId: string;
  sport: Sport;
  matchesPlayed?: number;
  wins?: number;
  losses?: number;
};

export type UpdatePlayerStatsData = {
  matchesPlayed?: number;
  wins?: number;
  losses?: number;
};

export class PlayerStatsService {
  private constructor(private readonly prisma: DatabaseClient) {}

  static resolve() {
    const prisma = container.resolve<DatabaseClient>(TOKENS.prisma);
    return new PlayerStatsService(prisma);
  }

  async createPlayerStats(data: CreatePlayerStatsData) {
    const userExists = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!userExists) {
      throw new Error("User not found");
    }

    const payload: Prisma.PlayerStatsCreateInput = {
      sport: data.sport,
      matchesPlayed: data.matchesPlayed ?? 0,
      wins: data.wins ?? 0,
      losses: data.losses ?? 0,
      user: {
        connect: { id: data.userId },
      },
    };

    return this.prisma.playerStats.create({ 
      data: payload,
      include: {
        user: true,
      },
    });
  }

  async listPlayerStats(userId?: string, sport?: Sport) {
    const where: Prisma.PlayerStatsWhereInput = {};
    if (userId) {
      where.userId = userId;
    }
    if (sport) {
      where.sport = sport;
    }

    return this.prisma.playerStats.findMany({
      where,
      include: {
        user: true,
      },
      orderBy: { matchesPlayed: "desc" },
    });
  }

  async getPlayerStatsById(id: string) {
    return this.prisma.playerStats.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  }

  async updatePlayerStats(id: string, data: UpdatePlayerStatsData) {
    const exists = await this.prisma.playerStats.findUnique({ where: { id } });
    if (!exists) {
      return null;
    }

    const payload: Prisma.PlayerStatsUpdateInput = {};
    if (data.matchesPlayed !== undefined) {
      payload.matchesPlayed = data.matchesPlayed;
    }
    if (data.wins !== undefined) {
      payload.wins = data.wins;
    }
    if (data.losses !== undefined) {
      payload.losses = data.losses;
    }

    return this.prisma.playerStats.update({
      where: { id },
      data: payload,
      include: {
        user: true,
      },
    });
  }

  async deletePlayerStats(id: string) {
    const exists = await this.prisma.playerStats.findUnique({ where: { id } });
    if (!exists) {
      return false;
    }
    await this.prisma.playerStats.delete({ where: { id } });
    return true;
  }
}
