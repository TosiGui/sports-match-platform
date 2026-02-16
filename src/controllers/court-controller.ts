import type { CreateCourtData, UpdateCourtData } from "../services/court-service";
import { CourtService } from "../services/court-service";
import type { Court } from "../../generated/prisma/client";

export interface CourtControllerContract {
  createCourt(data: CreateCourtData): Promise<Court>;
  listCourts(clubId?: string): Promise<Court[]>;
  getCourtById(id: string): Promise<Court | null>;
  updateCourt(id: string, data: UpdateCourtData): Promise<Court | null>;
  deleteCourt(id: string): Promise<boolean>;
}

export class CourtController implements CourtControllerContract {
  private constructor(private readonly service: CourtService) {}

  static resolve(): CourtControllerContract {
    const service = CourtService.resolve();
    return new CourtController(service);
  }

  async createCourt(data: CreateCourtData) {
    return this.service.createCourt(data);
  }

  async listCourts(clubId?: string) {
    return this.service.listCourts(clubId);
  }

  async getCourtById(id: string) {
    return this.service.getCourtById(id);
  }

  async updateCourt(id: string, data: UpdateCourtData) {
    return this.service.updateCourt(id, data);
  }

  async deleteCourt(id: string) {
    return this.service.deleteCourt(id);
  }
}
