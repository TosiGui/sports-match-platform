import type { CreateCityData, UpdateCityData } from "../services/city-service";
import { CityService } from "../services/city-service";
import type { City } from "../../generated/prisma/client";

export interface CityControllerContract {
  createCity(data: CreateCityData): Promise<City>;
  listCities(): Promise<City[]>;
  getCityById(id: string): Promise<City | null>;
  updateCity(id: string, data: UpdateCityData): Promise<City | null>;
  deleteCity(id: string): Promise<boolean>;
}

export class CityController implements CityControllerContract {
  private constructor(private readonly service: CityService) {}

  static resolve(): CityControllerContract {
    const service = CityService.resolve();
    return new CityController(service);
  }

  async createCity(data: CreateCityData) {
    return this.service.createCity(data);
  }

  async listCities() {
    return this.service.listCities();
  }

  async getCityById(id: string) {
    return this.service.getCityById(id);
  }

  async updateCity(id: string, data: UpdateCityData) {
    return this.service.updateCity(id, data);
  }

  async deleteCity(id: string) {
    return this.service.deleteCity(id);
  }
}
