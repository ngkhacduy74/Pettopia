import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  VetInviteToken,
  VetInviteTokenDocument,
  VetInviteTokenStatus,
} from 'src/schemas/vet.inviteToken';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VetInviteRepository {
  constructor(
    @InjectModel(VetInviteToken.name)
    private readonly inviteModel: Model<VetInviteTokenDocument>,
  ) {}

  async createInvite(
    email: string,
    clinicId: string,
    token: string,
    expiresAt: Date,
  ) {
    await this.inviteModel.deleteMany({ email });
    return this.inviteModel.create({
      id: uuidv4(),
      email,
      token,
      // invited_by: clinicId, // Người mời (thường là ID người dùng)
      clinic_id: clinicId,
      status: VetInviteTokenStatus.PENDING,
      expires_at: expiresAt,
    });
  }

  async findByToken(token: string) {
    return this.inviteModel.findOne({ token: token });
  }

  async markAsAccepted(invite: VetInviteTokenDocument) {
    invite.status = VetInviteTokenStatus.ACCEPTED;
    return invite.save();
  }
}
