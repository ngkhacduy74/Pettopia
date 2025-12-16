export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'canceled';

export interface CreatePaymentDto {
  description: string;
  amount: number;
  userId: string;
  orderId?: string; // Optional - sẽ được tự động tạo nếu không có
}

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  provider: string;
  status: PaymentStatus;
  metadata: Record<string, unknown>;
  paymentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
