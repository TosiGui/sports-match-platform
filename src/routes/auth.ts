import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AuthService } from "../services/auth-service";

const googleAuthSchema = z.object({
  idToken: z.string().min(1, "idToken is required"),
});

export async function registerAuthRoutes(app: FastifyInstance) {
  const authService = AuthService.resolve();

  app.post("/auth/google", async (request, reply) => {
    const { idToken } = googleAuthSchema.parse(request.body);

    try {
      const googleUser = await authService.verifyGoogleToken(idToken);
      const user = await authService.findOrCreateUser(googleUser);

      const token = app.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: "7d" }
      );

      return reply.send({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Google")) {
        return reply.code(401).send({ message: error.message });
      }
      if (error instanceof Error && error.message === "Token audience mismatch") {
        return reply.code(401).send({ message: error.message });
      }
      throw error;
    }
  });

  app.get("/auth/me", {
    preHandler: [(app as any).authenticate],
    handler: async (request, reply) => {
      const { id } = request.user as { id: string };
      const prisma = (await import("../../lib/container")).container.resolve<any>(
        (await import("../../lib/container")).TOKENS.prisma
      );
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return reply.code(404).send({ message: "User not found" });
      }
      return reply.send({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      });
    },
  });
}
