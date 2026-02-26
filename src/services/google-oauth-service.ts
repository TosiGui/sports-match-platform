import { createGoogleOAuthClient } from '../config/google-oauth.js';
import type { GoogleUserInfo, GoogleTokenResponse } from '../types/auth.js';

export class GoogleOAuthService {
  private client = createGoogleOAuthClient();

  async getTokensFromCode(code: string): Promise<GoogleTokenResponse> {
    const { tokens } = await this.client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
      token_type: tokens.token_type || 'Bearer',
      scope: tokens.scope || '',
      id_token: tokens.id_token,
    };
  }

  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    this.client.setCredentials({ access_token: accessToken });

    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info from Google');
    }

    const userInfo = await response.json() as GoogleUserInfo;

    if (!userInfo.email || !userInfo.id) {
      throw new Error('Invalid user info from Google');
    }

    return userInfo;
  }

  async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email || !payload.sub) {
      throw new Error('Invalid ID token');
    }

    return {
      id: payload.sub,
      email: payload.email,
      verified_email: payload.email_verified || false,
      name: payload.name || '',
      given_name: payload.given_name,
      family_name: payload.family_name,
      picture: payload.picture,
      locale: payload.locale,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
    this.client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await this.client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    return {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expires_in: credentials.expiry_date ? Math.floor((credentials.expiry_date - Date.now()) / 1000) : 3600,
      token_type: credentials.token_type || 'Bearer',
      scope: credentials.scope || '',
      id_token: credentials.id_token,
    };
  }
}
