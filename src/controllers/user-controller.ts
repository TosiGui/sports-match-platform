import type { CreateUserData, UpdateUserData } from "../services/user-service";
import { UserService } from "../services/user-service";
import type { User } from "../../generated/prisma/client";

export interface UserControllerContract {
  createUser(data: CreateUserData): Promise<User>;
  listUsers(): Promise<User[]>;
  getUserById(id: string): Promise<User | null>;
  updateUser(id: string, data: UpdateUserData): Promise<User | null>;
  deleteUser(id: string): Promise<boolean>;
}

export class UserController implements UserControllerContract {
  private constructor(private readonly service: UserService) {}

  static resolve(): UserControllerContract {
    const service = UserService.resolve();
    return new UserController(service);
  }

  async createUser(data: CreateUserData) {
    return this.service.createUser(data);
  }

  async listUsers() {
    return this.service.listUsers();
  }

  async getUserById(id: string) {
    return this.service.getUserById(id);
  }

  async updateUser(id: string, data: UpdateUserData) {
    return this.service.updateUser(id, data);
  }

  async deleteUser(id: string) {
    return this.service.deleteUser(id);
  }
}
