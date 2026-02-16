import type { FastifyInstance } from "fastify";
import { registerUserRoutes } from "./users";
import { registerMatchRoutes } from "./matches";
import { registerMatchParticipantRoutes } from "./match-participants";
import { registerCityRoutes } from "./cities";
import { registerClubRoutes } from "./clubs";
import { registerCourtRoutes } from "./courts";
import { registerPlayerStatsRoutes } from "./player-stats";
import { registerUserReputationRoutes } from "./user-reputations";
import { registerPaymentRoutes } from "./payments";

export async function registerRoutes(app: FastifyInstance) {
  await registerUserRoutes(app);
  await registerCityRoutes(app);
  await registerClubRoutes(app);
  await registerCourtRoutes(app);
  await registerMatchRoutes(app);
  await registerMatchParticipantRoutes(app);
  await registerPlayerStatsRoutes(app);
  await registerUserReputationRoutes(app);
  await registerPaymentRoutes(app);
}
