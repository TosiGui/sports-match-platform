import type { FastifyRequest, FastifyReply } from 'fastify';
import { JWTService } from '../services/jwt-service.js';
import { SessionService } from '../services/session-service.js';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const token = extractToken(request);

    if (!token) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'No token provided',
      });
    }

    const jwtService = new JWTService();
    const payload = jwtService.verifyAccessToken(token);

    const sessionService = new SessionService();
    const session = await sessionService.getSession(payload.sessionId);

    if (!session || session.expiresAt < new Date()) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired session',
      });
    }

    request.user = {
      id: payload.userId,
      email: payload.email,
      sessionId: payload.sessionId,
    };
  } catch (error) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Invalid token',
    });
  }
}

export async function optionalAuthenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const token = extractToken(request);

    if (!token) {
      return;
    }

    const jwtService = new JWTService();
    const payload = jwtService.verifyAccessToken(token);

    const sessionService = new SessionService();
    const session = await sessionService.getSession(payload.sessionId);

    if (session && session.expiresAt >= new Date()) {
      request.user = {
        id: payload.userId,
        email: payload.email,
        sessionId: payload.sessionId,
      };
    }
  } catch {
    // Silently ignore errors for optional auth
  }
}

function extractToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return (request.cookies?.accessToken as string) || null;
}
