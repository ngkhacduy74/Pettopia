import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { createRpcError } from 'src/common/error.detail';
import { CreateVetDto } from 'src/dto/vet/create-vet.dto';
import { UpdateStatusVetDto } from 'src/dto/vet/update-vet-form';
import { VetRegisterDto } from 'src/dto/vet/vet-register-form';
import { VetRepository } from 'src/repositories/vet/vet.repositories';
import { RegisterStatus } from 'src/schemas/clinic/clinic-register.schema';

@Injectable()
export class VetService {
  constructor(
    private readonly vetRepositories: VetRepository,
    @Inject('CUSTOMER_SERVICE') private readonly customerService: ClientProxy,
  ) { }

  async vetRegister(
    user_id: string,
    vetRegisterData: VetRegisterDto,
  ): Promise<any> {
    try {
      const existingVet = await this.vetRepositories.findVetById(user_id);
      if (existingVet) {
        throw new BadRequestException('Bác sĩ đã đăng ký trước đó.');
      }

      const pendingForm = await this.vetRepositories.findPendingVetFormByUserId(user_id);
      if (pendingForm) {
        throw new BadRequestException('Bạn đã có đơn đăng ký đang chờ duyệt.');
      }

      const newVetForm = await this.vetRepositories.create(
        vetRegisterData,
        user_id,
      );
      return {
        message: 'Đăng ký bác sĩ thành công.',
        vet: newVetForm,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Đăng ký bác sĩ thất bại. Vui lòng thử lại.',
      );
    }
  }
  async getVetById(id: string): Promise<any> {
    try {
      if (!id) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'ID của bác sĩ thú y không được để trống',
          'Bad Request',
        );
      }

      const result = await this.vetRepositories.findVetById(id);

      if (!result) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          `Không tìm thấy bác sĩ thú y với ID: ${id}`,
          'Not Found',
        );
      }

      return {
        status: 'success',
        message: 'Lấy thông tin bác sĩ thú y thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi lấy thông tin bác sĩ thú y',
        'Internal Server Error',
        error?.message || error,
      );
    }
  }
  async getVetByClinic(clinic_id: string, vet_id: string): Promise<any> {
    try {
      if (!clinic_id || !vet_id) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'clinic_id và vet_id không được để trống',
          'Bad Request'
        );
      }
      const clinic = await this.vetRepositories.findOneVetByClinic(clinic_id, vet_id);
      if (!clinic) {
        throw createRpcError(
          HttpStatus.FORBIDDEN,
          'Bác sĩ này không thuộc phòng khám của bạn',
          'Forbidden'
        );
      }

      const vet = await this.vetRepositories.findVetById(vet_id);

      if (!vet) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          `Không tìm thấy bác sĩ thú y với ID: ${vet_id}`,
          'Not Found'
        );
      }

      return {
        status: 'success',
        message: 'Lấy thông tin bác sĩ thuộc phòng khám thành công',
        data: vet,
      };

    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Lỗi hệ thống khi lấy thông tin bác sĩ',
        'Internal Server Error',
        error?.message || error,
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

            await lastValueFrom(
              this.customerService.send(
                { cmd: 'add_user_role' },
                { userId: updatedVetForm.user_id, role: 'Vet' },
              ),
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
