import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ClinicInvitation,
  ClinicInvitationDocument,
  ClinicInvitationStatus,
} from 'src/schemas/clinic/clinic-invitation.schema';

@Injectable()
export class ClinicInvitationRepository {
  constructor(
    @InjectModel(ClinicInvitation.name)
    private readonly invitationModel: Model<ClinicInvitationDocument>,
  ) {}

  async createInvitation(
    invitation: Partial<ClinicInvitation>,
  ): Promise<ClinicInvitation> {
    try {
      const doc = new this.invitationModel(invitation);
      return await doc.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException(
          'Đã tồn tại lời mời đang chờ xử lý cho email này.',
        );
      }
      throw new InternalServerErrorException(
        error.message || 'Không thể tạo lời mời phòng khám.',
      );
    }
  }

  async findByToken(token: string): Promise<ClinicInvitation | null> {
    try {
      return await this.invitationModel.findOne({ token }).lean().exec();
    } catch (err: any) {
      throw new InternalServerErrorException(
        err.message || 'Không thể tìm lời mời theo token.',
      );
    }
  }

  async findPendingByClinicAndEmail(
    clinic_id: string,
    invited_email: string,
  ): Promise<ClinicInvitation | null> {
    try {
      return await this.invitationModel
        .findOne({
          clinic_id,
          invited_email,
          status: ClinicInvitationStatus.PENDING,
        })
        .lean()
        .exec();
    } catch (err: any) {
      throw new InternalServerErrorException(
        err.message || 'Không thể tìm lời mời đang chờ.',
      );
    }
  }

  async markAsAccepted(
    id: string,
    acceptedBy: string,
  ): Promise<ClinicInvitation> {
    try {
      const updated = await this.invitationModel
        .findOneAndUpdate(
          { id },
          {
            $set: {
              status: ClinicInvitationStatus.ACCEPTED,
              accepted_by: acceptedBy,
              accepted_at: new Date(),
            },
          },
          { new: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException('Không tìm thấy lời mời để cập nhật.');
      }

      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      throw new InternalServerErrorException(
        error.message || 'Không thể cập nhật trạng thái lời mời.',
      );
    }
  }

  async markAsDeclined(id: string): Promise<ClinicInvitation> {
    try {
      const updated = await this.invitationModel
        .findOneAndUpdate(
          { id },
          {
            $set: {
              status: ClinicInvitationStatus.DECLINED,
              declined_at: new Date(),
            },
          },
          { new: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException('Không tìm thấy lời mời để cập nhật.');
      }

      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      throw new InternalServerErrorException(
        error.message || 'Không thể cập nhật trạng thái lời mời.',
      );
    }
  }

  async cancelPendingInvitation(id: string): Promise<void> {
    try {
      await this.invitationModel
        .findOneAndUpdate(
          { id, status: ClinicInvitationStatus.PENDING },
          { $set: { status: ClinicInvitationStatus.CANCELLED } },
        )
        .exec();
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.message || 'Không thể huỷ lời mời.',
      );
    }
  }
}
