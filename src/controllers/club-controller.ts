import type { CreateClubData, UpdateClubData } from "../services/club-service";
import { ClubService } from "../services/club-service";
import type { Club } from "../../generated/prisma/client";

export interface ClubControllerContract {
  createClub(data: CreateClubData): Promise<Club>;
  listClubs(cityId?: string): Promise<Club[]>;
  getClubById(id: string): Promise<Club | null>;
  updateClub(id: string, data: UpdateClubData): Promise<Club | null>;
  deleteClub(id: string): Promise<boolean>;
}

export class ClubController implements ClubControllerContract {
  private constructor(private readonly service: ClubService) {}

  static resolve(): ClubControllerContract {
    const service = ClubService.resolve();
    return new ClubController(service);
  }

  async createClub(data: CreateClubData) {
    return this.service.createClub(data);
  }

  async listClubs(cityId?: string) {
    return this.service.listClubs(cityId);
  }

  async getClubById(id: string) {
    return this.service.getClubById(id);
  }

  async updateClub(id: string, data: UpdateClubData) {
    return this.service.updateClub(id, data);
  }

  async deleteClub(id: string) {
    return this.service.deleteClub(id);
  }
}
