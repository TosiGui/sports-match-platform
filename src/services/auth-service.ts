import { container } from 'tsyringe';
import { PrismaClient } from '../generated/prisma/client/index.js';
import { GoogleOAuthService } from './google-oauth-service.js';
import { SessionService } from './session-service.js';
import { JWTService } from './jwt-service.js';
import type { AuthResponse, GoogleUserInfo, CreateAccountData } from '../types/auth.js';

export class AuthService {
  private prisma: PrismaClient;
  private googleOAuthService: GoogleOAuthService;
  private sessionService: SessionService;
  private jwtService: JWTService;

  constructor() {
    this.prisma = container.resolve(PrismaClient);
    this.googleOAuthService = new GoogleOAuthService();
    this.sessionService = new SessionService();
    this.jwtService = new JWTService();
  }

  async authenticateWithGoogle(code: string): Promise<AuthResponse> {
    const tokenResponse = await this.googleOAuthService.getTokensFromCode(code);
    
    const userInfo = await this.googleOAuthService.getUserInfo(tokenResponse.access_token);

    const { user, isNewUser } = await this.findOrCreateUser(userInfo);

    await this.createOrUpdateAccount({
      userId: user.id,
      provider: 'GOOGLE',
      providerAccountId: userInfo.id,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
      tokenType: tokenResponse.token_type,
      scope: tokenResponse.scope,
      idToken: tokenResponse.id_token,
    });

    const session = await this.sessionService.createSession({
      userId: user.id,
      expiresAt: this.sessionService.getSessionExpirationDate(),
    });

    const tokens = this.jwtService.generateTokens(user.id, user.email!, session.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email!,
        image: user.image || undefined,
        emailVerified: userInfo.verified_email,
      },
      tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    const payload = this.jwtService.verifyRefreshToken(refreshToken);

    const session = await this.sessionService.getSession(payload.sessionId);

    if (!session || session.expiresAt < new Date()) {
      throw new Error('Invalid or expired session');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.email) {
      throw new Error('User not found');
    }

    const tokens = this.jwtService.generateTokens(user.id, user.email, session.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image || undefined,
        emailVerified: !!user.emailVerified,
      },
      tokens,
    };
  }

  async logout(sessionId: string): Promise<boolean> {
    return await this.sessionService.deleteSession(sessionId);
  }

  async logoutAllSessions(userId: string): Promise<number> {
    return await this.sessionService.deleteUserSessions(userId);
  }

  async getSessionInfo(sessionId: string) {
    const session = await this.sessionService.getSession(sessionId);
    
    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
      user: session.user,
    };
  }

  private async findOrCreateUser(googleUserInfo: GoogleUserInfo) {
    let user = await this.prisma.user.findUnique({
      where: { email: googleUserInfo.email },
    });

    let isNewUser = false;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUserInfo.email,
          name: googleUserInfo.name,
          image: googleUserInfo.picture,
          emailVerified: googleUserInfo.verified_email ? new Date() : null,
        },
      });
      isNewUser = true;
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: googleUserInfo.name,
          image: googleUserInfo.picture,
          emailVerified: googleUserInfo.verified_email && !user.emailVerified ? new Date() : user.emailVerified,
        },
      });
    }

    return { user, isNewUser };
  }

  private async createOrUpdateAccount(data: CreateAccountData) {
    const existing = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: data.provider,
          providerAccountId: data.providerAccountId,
        },
      },
    });

    if (existing) {
      return await this.prisma.account.update({
        where: { id: existing.id },
        data: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || existing.refreshToken,
          expiresAt: data.expiresAt,
          tokenType: data.tokenType,
          scope: data.scope,
          idToken: data.idToken,
        },
      });
    }

    return await this.prisma.account.create({
      data: {
        userId: data.userId,
        provider: data.provider,
        providerAccountId: data.providerAccountId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        tokenType: data.tokenType,
        scope: data.scope,
        idToken: data.idToken,
      },
    });
  }
}
