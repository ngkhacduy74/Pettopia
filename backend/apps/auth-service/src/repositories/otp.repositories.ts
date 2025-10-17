// src/repositories/otp.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Otp, OtpDocument, OtpMethod } from '../schemas/otp.schema';

@Injectable()
export class OtpRepository {
  constructor(@InjectModel(Otp.name) private otpModel: Model<OtpDocument>) {}

  async createOtp(
    target: string,
    code: string,
    method: OtpMethod,
    expiresAt: Date,
  ): Promise<OtpDocument> {
    return this.otpModel.create({
      target,
      code,
      method,
      expires_at: expiresAt,
    });
  }

  async deleteExistingOtps(target: string, method: OtpMethod): Promise<any> {
    return this.otpModel.deleteMany({ target, method });
  }

  async findAndVerifyOtp(
    target: string,
    code: string,
    method: OtpMethod,
  ): Promise<OtpDocument | null> {
    return this.otpModel
      .findOne({
        target,
        code,
        method,
        expires_at: { $gt: new Date() },
      })
      .sort({ created_at: -1 })
      .exec();
  }

  async deleteOtp(id: string): Promise<any> {
    return this.otpModel.deleteOne({ _id: id });
  }
}
