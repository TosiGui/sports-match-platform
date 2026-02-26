export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
    emailVerified: boolean;
  };
  tokens: AuthTokens;
}

export interface JWTPayload {
  userId: string;
  email: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface SessionData {
  id: string;
  userId: string;
  sessionToken: string;
  expiresAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

export interface CreateAccountData {
  userId: string;
  provider: 'GOOGLE' | 'EMAIL' | 'PHONE';
  providerAccountId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
  idToken?: string;
}

export interface CreateSessionData {
  userId: string;
  expiresAt: Date;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      sessionId: string;
    };
  }
}
