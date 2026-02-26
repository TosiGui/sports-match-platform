import { AuthService } from '../services/auth-service.js';
import type { AuthResponse } from '../types/auth.js';

export interface AuthControllerContract {
  authenticateWithGoogle(code: string): Promise<AuthResponse>;
  refreshTokens(refreshToken: string): Promise<AuthResponse>;
  logout(sessionId: string): Promise<boolean>;
  logoutAllSessions(userId: string): Promise<number>;
  getSessionInfo(sessionId: string): Promise<any>;
}

export class AuthController implements AuthControllerContract {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async authenticateWithGoogle(code: string): Promise<AuthResponse> {
    return await this.authService.authenticateWithGoogle(code);
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    return await this.authService.refreshTokens(refreshToken);
  }

  async logout(sessionId: string): Promise<boolean> {
    return await this.authService.logout(sessionId);
  }

  async logoutAllSessions(userId: string): Promise<number> {
    return await this.authService.logoutAllSessions(userId);
  }

  async getSessionInfo(sessionId: string) {
    return await this.authService.getSessionInfo(sessionId);
  }
}
