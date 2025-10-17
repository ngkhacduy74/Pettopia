import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateClinicFormDto } from 'src/dto/clinic/create-clinic-form.dto';
import { CreateClinicDto } from 'src/dto/clinic/create-clinic.dto';
import { UpdateStatusClinicDto } from 'src/dto/clinic/update-status.dto';
import { UpdateStatusVetDto } from 'src/dto/vet/update-vet-form';
import { VetRegisterDto } from 'src/dto/vet/vet-register-form';
import { ClinicsRepository } from 'src/repositories/clinic/clinic.repositories';
import { VetRepository } from 'src/repositories/vet/vet.repositories';
import { RegisterStatus } from 'src/schemas/clinic/clinic-register.schema';
import { VetDocument } from 'src/schemas/vet/vet.schema';

@Injectable()
export class VetService {
  constructor(
    private readonly vetRepositories: VetRepository,
    // private readonly vetModel: VetDocument,
  ) {}

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
  // async updateVetFormStatus(body: UpdateStatusVetDto): Promise<any> {
  //   try {
  //     const updatedVetForm =
  //       await this.vetRepositories.updateVetFormStatus(body);

  //     if (updatedVetForm.status === RegisterStatus.APPROVED) {
  //       const existingVet = await this.vetModel.findOne({
  //         vet_form_id: updatedVetForm.id,
  //       });

  //       if (!existingVet) {
  //         const newVet = await this.vetModel.create({
  //           name: updatedVetForm.name,
  //           email: updatedVetForm.email,
  //           phone: updatedVetForm.phone,
  //           clinic_id: updatedVetForm.clinic_id,
  //           vet_form_id: updatedVetForm.id,
  //           created_by: updatedVetForm.review_by,
  //         });
  //         console.log('✅ Bác sĩ mới được tạo:', newVet._id);
  //       }
  //     }

  //     return {
  //       message: 'Cập nhật trạng thái hồ sơ bác sĩ thành công.',
  //       vet_form: updatedVetForm,
  //     };
  //   } catch (error) {
  //     console.error('Lỗi khi cập nhật hồ sơ bác sĩ:', error.message);
  //     throw new InternalServerErrorException(
  //       'Cập nhật trạng thái hồ sơ bác sĩ thất bại. Vui lòng thử lại.',
  //     );
  //   }
  // }
}
