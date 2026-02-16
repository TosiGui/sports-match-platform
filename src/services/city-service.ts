import type { Prisma } from "../../generated/prisma/client";
import { container, TOKENS } from "../../lib/container";
import type { DatabaseClient } from "../../lib/prisma";

export type CreateCityData = {
  name: string;
  state: string;
};

export type UpdateCityData = {
  name?: string | undefined;
  state?: string | undefined;
};

export class CityService {
  private constructor(private readonly prisma: DatabaseClient) {}

  static resolve() {
    const prisma = container.resolve<DatabaseClient>(TOKENS.prisma);
    return new CityService(prisma);
  }

  async createCity(data: CreateCityData) {
    const payload: Prisma.CityCreateInput = {
      name: data.name,
      state: data.state,
    };
    return this.prisma.city.create({ data: payload });
  }

  async listCities() {
    return this.prisma.city.findMany({ 
      orderBy: [{ state: "asc" }, { name: "asc" }] 
    });
  }

  async getCityById(id: string) {
    return this.prisma.city.findUnique({ where: { id } });
  }

  async updateCity(id: string, data: UpdateCityData) {
    const exists = await this.prisma.city.findUnique({ where: { id } });
    if (!exists) {
      return null;
    }

    const payload: Prisma.CityUpdateInput = {};
    if (data.name !== undefined) {
      payload.name = data.name;
    }
    if (data.state !== undefined) {
      payload.state = data.state;
    }

    return this.prisma.city.update({ where: { id }, data: payload });
  }

  async deleteCity(id: string) {
    const exists = await this.prisma.city.findUnique({ where: { id } });
    if (!exists) {
      return false;
    }
    await this.prisma.city.delete({ where: { id } });
    return true;
  }
}
