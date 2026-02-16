import type { Prisma } from "../../generated/prisma/client";
import { container, TOKENS } from "../../lib/container";
import type { DatabaseClient } from "../../lib/prisma";

export type JoinMatchData = {
  matchId: string;
  userId: string;
  status: string;
};

export type UpdateParticipantStatusData = {
  status: string;
};

export class MatchParticipantService {
  private constructor(private readonly prisma: DatabaseClient) {}

  static resolve() {
    const prisma = container.resolve<DatabaseClient>(TOKENS.prisma);
    return new MatchParticipantService(prisma);
  }

  async joinMatch(data: JoinMatchData) {
    const match = await this.prisma.match.findUnique({
      where: { id: data.matchId },
      include: {
        participants: true,
      },
    });

    if (!match) {
      throw new Error("Match not found");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const existingParticipant = await this.prisma.matchParticipant.findFirst({
      where: {
        matchId: data.matchId,
        userId: data.userId,
      },
    });

    if (existingParticipant) {
      throw new Error("User already joined this match");
    }

    const confirmedCount = match.participants.filter(
      (p) => p.status === "confirmed"
    ).length;

    if (data.status === "confirmed" && confirmedCount >= match.maxPlayers) {
      throw new Error("Match is full");
    }

    const payload: Prisma.MatchParticipantCreateInput = {
      status: data.status,
      match: {
        connect: { id: data.matchId },
      },
      user: {
        connect: { id: data.userId },
      },
    };

    return this.prisma.matchParticipant.create({ data: payload });
  }

  async listParticipantsByMatch(matchId: string) {
    return this.prisma.matchParticipant.findMany({
      where: { matchId },
      include: {
        user: true,
      },
      orderBy: { joinedAt: "asc" },
    });
  }

  async updateParticipantStatus(id: string, status: string) {
    const participant = await this.prisma.matchParticipant.findUnique({
      where: { id },
      include: {
        match: {
          include: {
            participants: true,
          },
        },
      },
    });

    if (!participant) {
      return null;
    }

    if (status === "confirmed" && participant.status !== "confirmed") {
      const confirmedCount = participant.match.participants.filter(
        (p) => p.status === "confirmed"
      ).length;

      if (confirmedCount >= participant.match.maxPlayers) {
        throw new Error("Match is full");
      }
    }

    return this.prisma.matchParticipant.update({
      where: { id },
      data: { status },
    });
  }

  async leaveMatch(matchId: string, userId: string) {
    const participant = await this.prisma.matchParticipant.findFirst({
      where: {
        matchId,
        userId,
      },
    });

    if (!participant) {
      return false;
    }

    await this.prisma.matchParticipant.delete({
      where: { id: participant.id },
    });

    return true;
  }
}
