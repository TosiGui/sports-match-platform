import jwt from 'jsonwebtoken';
import { JWT_CONFIG, getAccessTokenExpiration, getRefreshTokenExpiration } from '../config/jwt.js';
import type { JWTPayload, RefreshTokenPayload, AuthTokens } from '../types/auth.js';

export class JWTService {
  generateAccessToken(userId: string, email: string, sessionId: string): string {
    const payload: JWTPayload = {
      userId,
      email,
      sessionId,
    };

    return jwt.sign(payload, JWT_CONFIG.secret, {
      expiresIn: JWT_CONFIG.expiresIn,
    });
  }

  generateRefreshToken(userId: string, sessionId: string): string {
    const payload: RefreshTokenPayload = {
      userId,
      sessionId,
    };

    return jwt.sign(payload, JWT_CONFIG.refreshSecret, {
      expiresIn: JWT_CONFIG.refreshExpiresIn,
    });
  }

  generateTokens(userId: string, email: string, sessionId: string): AuthTokens {
    const accessToken = this.generateAccessToken(userId, email, sessionId);
    const refreshToken = this.generateRefreshToken(userId, sessionId);

    return {
      accessToken,
      refreshToken,
      expiresIn: getAccessTokenExpiration(),
    };
  }

  verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, JWT_CONFIG.secret) as JWTPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(token, JWT_CONFIG.refreshSecret) as RefreshTokenPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }
}
