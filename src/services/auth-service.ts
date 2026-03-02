import { container, TOKENS } from "../../lib/container";
import type { DatabaseClient } from "../../lib/prisma";

export type GoogleUserPayload = {
  googleId: string;
  email: string;
  name: string;
  avatar: string | null;
};

export class AuthService {
  private constructor(private readonly prisma: DatabaseClient) {}

  static resolve() {
    const prisma = container.resolve<DatabaseClient>(TOKENS.prisma);
    return new AuthService(prisma);
  }

  async verifyGoogleToken(idToken: string): Promise<GoogleUserPayload> {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );

    if (!response.ok) {
      throw new Error("Invalid Google token");
    }

    const raw = (await response.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
      aud?: string;
    };

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && raw.aud !== clientId) {
      throw new Error("Token audience mismatch");
    }

    if (!raw.email || !raw.sub) {
      throw new Error("Invalid Google token: missing email or sub");
    }

    return {
      googleId: raw.sub,
      email: raw.email,
      name: raw.name ?? raw.email.split("@")[0],
      avatar: raw.picture ?? null,
    };
  }

  async findOrCreateUser(googleUser: GoogleUserPayload) {
    let user = await this.prisma.user.findUnique({
      where: { googleId: googleUser.googleId },
    });

    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: googleUser.name,
          avatar: googleUser.avatar ?? null,
          email: googleUser.email,
        },
      });
      return user;
    }

    user = await this.prisma.user.findFirst({
      where: { email: googleUser.email },
    });

    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleUser.googleId,
          avatar: googleUser.avatar ?? null,
        },
      });
      return user;
    }

    return this.prisma.user.create({
      data: {
        name: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.googleId,
        avatar: googleUser.avatar ?? null,
      },
    });
  }
}
