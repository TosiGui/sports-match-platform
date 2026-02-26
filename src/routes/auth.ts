import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthController } from '../controllers/auth-controller.js';
import { getGoogleAuthUrl } from '../config/google-oauth.js';
import { authenticate } from '../middleware/authenticate.js';

const googleCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export async function registerAuthRoutes(app: FastifyInstance) {
  const controller = new AuthController();

  app.get('/auth/google/login', async (_request, reply) => {
    const state = Math.random().toString(36).substring(7);
    const authUrl = getGoogleAuthUrl(state);

    return reply.send({
      url: authUrl,
      state,
    });
  });

  app.post('/auth/google/callback', async (request, reply) => {
    try {
      const { code } = googleCallbackSchema.parse(request.body);

      const authResponse = await controller.authenticateWithGoogle(code);

      reply.setCookie('accessToken', authResponse.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: authResponse.tokens.expiresIn,
        path: '/',
      });

      reply.setCookie('refreshToken', authResponse.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      return reply.code(200).send(authResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }

      return reply.code(401).send({
        error: 'Authentication Failed',
        message: error instanceof Error ? error.message : 'Failed to authenticate with Google',
      });
    }
  });

  app.post('/auth/refresh', async (request, reply) => {
    try {
      const { refreshToken } = refreshTokenSchema.parse(request.body);

      const authResponse = await controller.refreshTokens(refreshToken);

      reply.setCookie('accessToken', authResponse.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: authResponse.tokens.expiresIn,
        path: '/',
      });

      return reply.code(200).send(authResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }

      return reply.code(401).send({
        error: 'Token Refresh Failed',
        message: error instanceof Error ? error.message : 'Failed to refresh token',
      });
    }
  });

  app.post(
    '/auth/logout',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!request.user?.sessionId) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'No session found',
          });
        }

        const success = await controller.logout(request.user.sessionId);

        reply.clearCookie('accessToken', { path: '/' });
        reply.clearCookie('refreshToken', { path: '/' });

        return reply.code(200).send({
          success,
          message: 'Logged out successfully',
        });
      } catch (error) {
        return reply.code(500).send({
          error: 'Logout Failed',
          message: error instanceof Error ? error.message : 'Failed to logout',
        });
      }
    }
  );

  app.post(
    '/auth/logout-all',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!request.user?.id) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'No user found',
          });
        }

        const count = await controller.logoutAllSessions(request.user.id);

        reply.clearCookie('accessToken', { path: '/' });
        reply.clearCookie('refreshToken', { path: '/' });

        return reply.code(200).send({
          success: true,
          message: `Logged out from ${count} sessions`,
          count,
        });
      } catch (error) {
        return reply.code(500).send({
          error: 'Logout Failed',
          message: error instanceof Error ? error.message : 'Failed to logout from all sessions',
        });
      }
    }
  );

  app.get(
    '/auth/session',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!request.user?.sessionId) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'No session found',
          });
        }

        const sessionInfo = await controller.getSessionInfo(request.user.sessionId);

        if (!sessionInfo) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Session not found or expired',
          });
        }

        return reply.code(200).send(sessionInfo);
      } catch (error) {
        return reply.code(500).send({
          error: 'Session Fetch Failed',
          message: error instanceof Error ? error.message : 'Failed to fetch session',
        });
      }
    }
  );

  app.get(
    '/auth/me',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        if (!request.user?.sessionId) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'No session found',
          });
        }

        const sessionInfo = await controller.getSessionInfo(request.user.sessionId);

        if (!sessionInfo) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User not found',
          });
        }

        return reply.code(200).send(sessionInfo.user);
      } catch (error) {
        return reply.code(500).send({
          error: 'User Fetch Failed',
          message: error instanceof Error ? error.message : 'Failed to fetch user',
        });
      }
    }
  );
}
