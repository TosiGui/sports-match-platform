import { container } from 'tsyringe';
import { PrismaClient } from '../generated/prisma/client/index.js';
import type { CreateSessionData, SessionData } from '../types/auth.js';
import { randomBytes } from 'crypto';
import { getRefreshTokenExpiration } from '../config/jwt.js';

export class SessionService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = container.resolve(PrismaClient);
  }

  async createSession(data: CreateSessionData): Promise<SessionData> {
    const sessionToken = this.generateSessionToken();

    const session = await this.prisma.session.create({
      data: {
        userId: data.userId,
        sessionToken,
        expiresAt: data.expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return session;
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return session;
  }

  async getSessionByToken(sessionToken: string): Promise<SessionData | null> {
    const session = await this.prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return session;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await this.prisma.session.delete({
        where: { id: sessionId },
      });
      return true;
    } catch {
      return false;
    }
  }

  async deleteUserSessions(userId: string): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: { userId },
    });

    return result.count;
  }

  async cleanExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  async getUserActiveSessions(userId: string): Promise<SessionData[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sessions;
  }

  private generateSessionToken(): string {
    return randomBytes(32).toString('hex');
  }

  getSessionExpirationDate(): Date {
    const expiresInSeconds = getRefreshTokenExpiration();
    return new Date(Date.now() + expiresInSeconds * 1000);
  }
}
