// Các gói VIP với giá và thời hạn
export enum VipPackage {
  MONTHLY = 'MONTHLY', // 1 tháng
  QUARTERLY = 'QUARTERLY', // 3 tháng
  YEARLY = 'YEARLY', // 1 năm
}

export interface VipPackageInfo {
  amount: number;
  months: number;
  description: string;
}

export const VIP_PACKAGES: Record<VipPackage, VipPackageInfo> = {
  [VipPackage.MONTHLY]: {
    amount: 39000, // 39k
    months: 1,
    description: 'Gói VIP 1 tháng',
  },
  [VipPackage.QUARTERLY]: {
    amount: 115000, // 115k
    months: 3,
    description: 'Gói VIP 3 tháng',
  },
  [VipPackage.YEARLY]: {
    amount: 399000, // 399k
    months: 12,
    description: 'Gói VIP 1 năm',
  },
};

/**
 * Xác định gói VIP dựa trên số tiền thanh toán
 * @param amount Số tiền thanh toán
 * @returns Thông tin gói VIP hoặc null nếu không khớp
 */
export function getVipPackageByAmount(amount: number): VipPackageInfo | null {
  // Tìm gói VIP khớp với số tiền (cho phép sai số nhỏ để xử lý làm tròn)
  const packages = Object.values(VIP_PACKAGES);
  const matchedPackage = packages.find(
    (pkg) => Math.abs(pkg.amount - amount) < 1000, // Cho phép sai số 1000 VND
  );
  
  return matchedPackage || null;
}

/**
 * Tính ngày hết hạn VIP dựa trên số tháng
 * @param months Số tháng
 * @returns Ngày hết hạn
 */
export function calculateVipExpiresAt(months: number): Date {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);
  return expiresAt;
}

