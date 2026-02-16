import type { CreateMatchData, UpdateMatchData, MatchFilters } from "../services/match-service";
import { MatchService } from "../services/match-service";
import type { Match } from "../../generated/prisma/client";

export interface MatchControllerContract {
  createMatch(data: CreateMatchData): Promise<Match>;
  listMatches(filters?: MatchFilters): Promise<Match[]>;
  getMatchById(id: string): Promise<Match | null>;
  updateMatch(id: string, data: UpdateMatchData): Promise<Match | null>;
  deleteMatch(id: string): Promise<boolean>;
}

export class MatchController implements MatchControllerContract {
  private constructor(private readonly service: MatchService) {}

  static resolve(): MatchControllerContract {
    const service = MatchService.resolve();
    return new MatchController(service);
  }

  async createMatch(data: CreateMatchData) {
    return this.service.createMatch(data);
  }

  async listMatches(filters?: MatchFilters) {
    return this.service.listMatches(filters);
  }

  async getMatchById(id: string) {
    return this.service.getMatchById(id);
  }

  async updateMatch(id: string, data: UpdateMatchData) {
    return this.service.updateMatch(id, data);
  }

  async deleteMatch(id: string) {
    return this.service.deleteMatch(id);
  }
}
