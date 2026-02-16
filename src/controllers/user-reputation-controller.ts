import type { CreateUserReputationData, UpdateUserReputationData } from "../services/user-reputation-service";
import { UserReputationService } from "../services/user-reputation-service";
import type { UserReputation } from "../../generated/prisma/client";

export interface UserReputationControllerContract {
  createUserReputation(data: CreateUserReputationData): Promise<UserReputation>;
  listUserReputations(): Promise<UserReputation[]>;
  getUserReputationById(id: string): Promise<UserReputation | null>;
  getUserReputationByUserId(userId: string): Promise<UserReputation | null>;
  updateUserReputation(id: string, data: UpdateUserReputationData): Promise<UserReputation | null>;
  deleteUserReputation(id: string): Promise<boolean>;
}

export class UserReputationController implements UserReputationControllerContract {
  private constructor(private readonly service: UserReputationService) {}

  static resolve(): UserReputationControllerContract {
    const service = UserReputationService.resolve();
    return new UserReputationController(service);
  }

  async createUserReputation(data: CreateUserReputationData) {
    return this.service.createUserReputation(data);
  }

  async listUserReputations() {
    return this.service.listUserReputations();
  }

  async getUserReputationById(id: string) {
    return this.service.getUserReputationById(id);
  }

  async getUserReputationByUserId(userId: string) {
    return this.service.getUserReputationByUserId(userId);
  }

  async updateUserReputation(id: string, data: UpdateUserReputationData) {
    return this.service.updateUserReputation(id, data);
  }

  async deleteUserReputation(id: string) {
    return this.service.deleteUserReputation(id);
  }
}
