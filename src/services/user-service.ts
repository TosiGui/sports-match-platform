import type { Prisma } from "../../generated/prisma/client";
import { container, TOKENS } from "../../lib/container";
import type { DatabaseClient } from "../../lib/prisma";

export type CreateUserData = {
  name: string;
  phone?: string | undefined;
  email?: string | undefined;
};

export type UpdateUserData = {
  name?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
};

export class UserService {
  private constructor(private readonly prisma: DatabaseClient) {}

  static resolve() {
    const prisma = container.resolve<DatabaseClient>(TOKENS.prisma);
    return new UserService(prisma);
  }

  async createUser(data: CreateUserData) {
    const payload: Prisma.UserCreateInput = {
      name: data.name,
      phone: data.phone ?? null,
      email: data.email ?? null,
    };
    return this.prisma.user.create({ data: payload });
  }

  async listUsers() {
    return this.prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  }

  async getUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async updateUser(id: string, data: UpdateUserData) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) {
      return null;
    }

    const payload: Prisma.UserUpdateInput = {};
    if (data.name !== undefined) {
      payload.name = data.name;
    }
    if (data.phone !== undefined) {
      payload.phone = data.phone ?? null;
    }
    if (data.email !== undefined) {
      payload.email = data.email ?? null;
    }

    return this.prisma.user.update({ where: { id }, data: payload });
  }

  async deleteUser(id: string) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) {
      return false;
    }
    await this.prisma.user.delete({ where: { id } });
    return true;
  }
}
