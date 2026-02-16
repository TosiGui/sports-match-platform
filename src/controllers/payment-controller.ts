import type { CreatePaymentData, UpdatePaymentData } from "../services/payment-service";
import { PaymentService } from "../services/payment-service";
import type { Payment } from "../../generated/prisma/client";

export interface PaymentControllerContract {
  createPayment(data: CreatePaymentData): Promise<Payment>;
  listPayments(matchId?: string, userId?: string, status?: string): Promise<Payment[]>;
  getPaymentById(id: string): Promise<Payment | null>;
  updatePayment(id: string, data: UpdatePaymentData): Promise<Payment | null>;
  deletePayment(id: string): Promise<boolean>;
}

export class PaymentController implements PaymentControllerContract {
  private constructor(private readonly service: PaymentService) {}

  static resolve(): PaymentControllerContract {
    const service = PaymentService.resolve();
    return new PaymentController(service);
  }

  async createPayment(data: CreatePaymentData) {
    return this.service.createPayment(data);
  }

  async listPayments(matchId?: string, userId?: string, status?: string) {
    return this.service.listPayments(matchId, userId, status);
  }

  async getPaymentById(id: string) {
    return this.service.getPaymentById(id);
  }

  async updatePayment(id: string, data: UpdatePaymentData) {
    return this.service.updatePayment(id, data);
  }

  async deletePayment(id: string) {
    return this.service.deletePayment(id);
  }
}
