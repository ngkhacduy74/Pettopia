import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { identity } from 'rxjs';

import { CreateVetDto } from 'src/dto/vet/create-vet.dto';
import { UpdateStatusVetDto } from 'src/dto/vet/update-vet-form';
import { VetRegisterDto } from 'src/dto/vet/vet-register-form';
import { ClinicsRepository } from 'src/repositories/clinic/clinic.repositories';
import { VetRepository } from 'src/repositories/vet/vet.repositories';
import { RegisterStatus } from 'src/schemas/clinic/clinic-register.schema';
import { VetDocument } from 'src/schemas/vet/vet.schema';

@Injectable()
export class VetService {
  constructor(private readonly vetRepositories: VetRepository) {}

  async vetRegister(
    user_id: string,
    vetRegisterData: VetRegisterDto,
  ): Promise<any> {
    try {
      const existingVet = await this.vetRepositories.findVetById(user_id);
      if (existingVet) {
        throw new BadRequestException('Bác sĩ đã đăng ký trước đó.');
      } else {
        const newVetForm = await this.vetRepositories.create(
          vetRegisterData,
          user_id,
        );
        return {
          message: 'Đăng ký bác sĩ thành công.',
          vet: newVetForm,
        };
      }
    } catch (error) {
      throw new InternalServerErrorException(
        'Đăng ký bác sĩ thất bại. Vui lòng thử lại.',
      );
    }
  }
  async updateVetFormStatus(body: UpdateStatusVetDto): Promise<any> {
    try {
      const { id, review_by, status, note } = body;
      console.log('[updateVetFormStatus] Payload nhận được:', body);
      const updatedVetForm = await this.vetRepositories.updateVetFormStatus({
        id,
        status,
        note,
        review_by,
      });

      if (!updatedVetForm) {
        throw new NotFoundException('Không tìm thấy hồ sơ bác sĩ để cập nhật.');
      }
      if (updatedVetForm.status === RegisterStatus.APPROVED) {
        const existingVet = await this.vetRepositories.findOneVetByFormId(
          updatedVetForm.id,
        );

        if (!existingVet) {
          const newVetData: CreateVetDto = {
            id: updatedVetForm.user_id,
            is_active: true,
            specialty: updatedVetForm.specialty,
            subSpecialties: updatedVetForm.subSpecialties || [],
            exp: updatedVetForm.exp,
            bio: updatedVetForm.bio,
            license_number: updatedVetForm.license_number,
            license_image_url: updatedVetForm.license_image_url,
            social_link: updatedVetForm.social_link,
            certifications: updatedVetForm.certifications || [],
            clinic_id: updatedVetForm.clinic_id,
          };

          try {
            const newVet = await this.vetRepositories.createVet(newVetData);
            console.log(
              `[updateVetFormStatus] Bác sĩ mới được tạo: ${newVet.id}`,
            );
          } catch (createErr) {
            console.error(
              '[updateVetFormStatus] Lỗi khi tạo bác sĩ:',
              createErr,
            );
            try {
              await this.vetRepositories.rollBackStatusVetForm(
                updatedVetForm.id,
                RegisterStatus.PENDING,
              );
              console.warn(
                '[updateVetFormStatus] Đã rollback trạng thái form về PENDING.',
              );
            } catch (rbErr) {
              console.error('[updateVetFormStatus] Rollback thất bại:', rbErr);
            }

            throw new InternalServerErrorException(
              'Tạo hồ sơ bác sĩ thất bại. Đã thực hiện hoàn tác trạng thái form.',
            );
          }
        }
      }
      return {
        message: 'Cập nhật trạng thái hồ sơ bác sĩ thành công.',
        data: updatedVetForm,
      };
    } catch (error) {
      console.error('[updateVetFormStatus] Lỗi:', error);
      throw new InternalServerErrorException(
        error.message ||
          'Cập nhật trạng thái hồ sơ bác sĩ thất bại. Vui lòng thử lại sau.',
      );
    }
  }
  async getAllVetForm(page = 1, limit = 10, status?: string): Promise<any> {
    try {
      const skip = (page - 1) * limit;

      const filter = status ? { status } : {};

      const [forms, total] = await Promise.all([
        this.vetRepositories.findAllVetForms(skip, limit, filter),
        this.vetRepositories.countVetForms(filter),
      ]);

      return {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        items: forms,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Không thể lấy danh sách hồ sơ bác sĩ.',
      );
    }
  }
}
