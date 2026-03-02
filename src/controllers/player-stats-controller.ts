import type { CreatePlayerStatsData, UpdatePlayerStatsData } from "../services/player-stats-service";
import { PlayerStatsService } from "../services/player-stats-service";
import type { PlayerStats } from "../../generated/prisma/client";

export interface PlayerStatsControllerContract {
  createPlayerStats(data: CreatePlayerStatsData): Promise<PlayerStats>;
  listPlayerStats(userId?: string, sport?: string): Promise<PlayerStats[]>;
  getPlayerStatsById(id: string): Promise<PlayerStats | null>;
  updatePlayerStats(id: string, data: UpdatePlayerStatsData): Promise<PlayerStats | null>;
  deletePlayerStats(id: string): Promise<boolean>;
}

export class PlayerStatsController implements PlayerStatsControllerContract {
  private constructor(private readonly service: PlayerStatsService) {}

  static resolve(): PlayerStatsControllerContract {
    const service = PlayerStatsService.resolve();
    return new PlayerStatsController(service);
  }

  async createPlayerStats(data: CreatePlayerStatsData) {
    return this.service.createPlayerStats(data);
  }

  async listPlayerStats(userId?: string, sport?: string) {
    return this.service.listPlayerStats(userId, sport as any);
  }

  async getPlayerStatsById(id: string) {
    return this.service.getPlayerStatsById(id);
  }

  async updatePlayerStats(id: string, data: UpdatePlayerStatsData) {
    return this.service.updatePlayerStats(id, data);
  }

  async deletePlayerStats(id: string) {
    return this.service.deletePlayerStats(id);
  }
}
