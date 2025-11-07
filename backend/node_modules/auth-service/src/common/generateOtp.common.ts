import * as crypto from 'crypto';
export function generateOtpCode(): string {
  const chars =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const length = 8;
  let otp = '';
  const charsLength = chars.length;
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charsLength);
    otp += chars.charAt(randomIndex);
  }

  return otp;
}
