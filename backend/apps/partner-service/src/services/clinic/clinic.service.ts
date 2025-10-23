import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { CreateClinicFormDto } from 'src/dto/clinic/create-clinic-form.dto';
import { CreateClinicDto } from 'src/dto/clinic/create-clinic.dto';
import { UpdateStatusClinicDto } from 'src/dto/clinic/update-status.dto';
import { ClinicsRepository } from 'src/repositories/clinic/clinic.repositories';
import { ServiceRepository } from 'src/repositories/clinic/service.repositories';
import { RegisterStatus } from 'src/schemas/clinic/clinic-register.schema';

@Injectable()
export class ClinicService {
  constructor(
    private readonly clinicRepositories: ClinicsRepository,
    private readonly serviceRepositories: ServiceRepository,
    @Inject('CUSTOMER_SERVICE') private readonly customerService: ClientProxy,
  ) {}

  async createClinicForm(
    createClinicFormData: CreateClinicFormDto,
  ): Promise<any> {
    try {
      console.log('createClinicFormData12314', createClinicFormData);
      const result =
        await this.clinicRepositories.createClinicForm(createClinicFormData);
      if (!result) {
        throw new BadRequestException('Không thể tạo form đăng ký clinic');
      }

      return {
        success: true,
        message: 'Tạo form đăng ký clinic thành công',
        data: result,
      };
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi không xác định khi tạo form đăng ký clinic',
      );
    }
  }

  async findClinicFormById(idForm: string): Promise<any> {
    try {
      const result = await this.clinicRepositories.findOneClinicForm(idForm);

      if (!result) {
        throw new BadRequestException(
          `Không tìm thấy form clinic với ID: ${idForm}`,
        );
      }

      return {
        success: true,
        message: 'Lấy thông tin form clinic thành công',
        data: result,
      };
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }

      throw new InternalServerErrorException(
        err.message || 'Lỗi không xác định khi tìm form clinic theo ID',
      );
    }
  }
  async updateStatusClincForm(
    updateStatus: UpdateStatusClinicDto,
  ): Promise<any> {
    try {
      const clinicForm = await this.clinicRepositories.findOneClinicForm(
        updateStatus.id,
      );
      const result =
        await this.clinicRepositories.updateStatusClinicForm(updateStatus);
      console.log('updayasdaqw', result);
      if (!result) {
        throw new BadRequestException(
          'Không thể cập nhật trạng thái đơn đăng ký phòng khám',
        );
      }
      if (updateStatus.status === RegisterStatus.APPROVED) {
        try {
          const createDto: CreateClinicDto = {
            id: clinicForm.id,
            creator_id: clinicForm.user_id,
            clinic_name: clinicForm.clinic_name,
            email: clinicForm.email,
            phone: clinicForm.phone,
            license_number: clinicForm.license_number,
            address: clinicForm.address,
            description: clinicForm.description,
            logo_url: clinicForm.logo_url,
            website: clinicForm.website,
            representative: clinicForm.representative,
            is_active: true,
          };
          const createdClinic =
            await this.clinicRepositories.createClinic(createDto);
          if (createdClinic) {
            const add_role_clinic = await lastValueFrom(
              this.customerService.send(
                { cmd: 'auto_add_user_role' },
                { userId: clinicForm.user_id, role: 'Clinic' },
              ),
            );
          }
          return {
            success: true,
            message: 'Duyệt đơn thành công và đã tạo phòng khám',
            data: { register: result, clinic: createdClinic },
          };
        } catch (err) {
          await this.clinicRepositories.rollbackStatusToPending(result.id);

          throw new InternalServerErrorException(
            `Tạo phòng khám thất bại, trạng thái đã được khôi phục: ${err.message}`,
          );
        }
      }
      return {
        success: true,
        message: `Cập nhật trạng thái thành công: ${updateStatus.status}`,
        data: result,
      };
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new InternalServerErrorException(
        err.message ||
          'Lỗi không xác định khi cập nhật trạng thái form đăng ký clinic',
      );
    }
  }

  async updateClinicActiveStatus(id: string, is_active: boolean): Promise<any> {
    if (!id) {
      throw new BadRequestException('ID phòng khám không được để trống.');
    }
    const updatedClinic = await this.clinicRepositories.updateActiveStatus(
      id,
      is_active,
    );

    if (!updatedClinic) {
      throw new BadRequestException(`Không tìm thấy phòng khám với ID: ${id}`);
    }
    return {
      success: true,
      message: `Cập nhật trạng thái hoạt động của phòng khám ${id} thành công`,
      data: updatedClinic,
    };
  }
  async findAllClinic(page = 1, limit = 10): Promise<any> {
    try {
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.clinicRepositories.findAllClinic(skip, limit),
        this.clinicRepositories.countAllClinic(),
      ]);

      return {
        success: true,
        message: 'Lấy danh sách phòng khám thành công',
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi không xác định khi lấy danh sách phòng khám',
      );
    }
  }

  async findAllClinicForm(
    page: number = 1,
    limit: number = 10,
    status?: string,
  ): Promise<any> {
    try {
      page = Number(page);
      limit = Number(limit);
      const skip = (page - 1) * limit;

      const filters = { status, skip, limit };

      const { data, total } = await this.clinicRepositories.findAll(filters);

      return {
        success: true,
        message: 'Lấy danh sách form đăng ký phòng khám thành công',
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        data,
      };
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi khi lấy danh sách form đăng ký clinic',
      );
    }
  }

  async createService(data: any): Promise<any> {
    try {
      const result = await this.serviceRepositories.createService(data);

      if (!result) {
        throw new BadRequestException('Không thể tạo mới dịch vụ');
      }

      return {
        success: true,
        message: 'Tạo dịch vụ thành công',
        data: result,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;

      throw new InternalServerErrorException(
        err.message || 'Lỗi không xác định khi tạo dịch vụ',
      );
    }
  }

  async getAllService(page: number = 1, limit: number = 10): Promise<any> {
    try {
      const result = await this.serviceRepositories.getAllService(page, limit);

      return {
        success: true,
        message: 'Lấy danh sách dịch vụ thành công',
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
        data: result.data,
      };
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi khi lấy danh sách dịch vụ',
      );
    }
  }

  async updateService(
    serviceId: string,
    updateServiceDto: any,
    clinic_id: string,
  ): Promise<any> {
    try {
      const result = await this.serviceRepositories.updateService(
        serviceId,
        updateServiceDto,
        clinic_id,
      );

      if (!result) {
        throw new BadRequestException('Không tìm thấy dịch vụ để cập nhật');
      }

      return {
        success: true,
        message: 'Cập nhật dịch vụ thành công',
        data: result,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;

      throw new InternalServerErrorException(
        err.message || 'Lỗi khi cập nhật dịch vụ',
      );
    }
  }

  async removeService(serviceId: string, clinic_id: string): Promise<any> {
    try {
      const result = await this.serviceRepositories.removeService(
        serviceId,
        clinic_id,
      );

      if (!result || result.deletedCount === 0) {
        throw new BadRequestException('Không tìm thấy dịch vụ để xóa');
      }

      return {
        success: true,
        message: 'Xóa dịch vụ thành công',
        data: result,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;

      throw new InternalServerErrorException(
        err.message || 'Lỗi khi xóa dịch vụ',
      );
    }
  }

  async updateServiceStatus(id: string, is_active: boolean): Promise<any> {
    try {
      const result = await this.serviceRepositories.updateServiceStatus(
        id,
        is_active,
      );

      if (!result) {
        throw new BadRequestException(
          'Không tìm thấy dịch vụ cần cập nhật trạng thái',
        );
      }

      return {
        success: true,
        message: `Cập nhật trạng thái dịch vụ thành công (${is_active ? 'Kích hoạt' : 'Vô hiệu hóa'})`,
        data: result,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;

      throw new InternalServerErrorException(
        err.message || 'Lỗi khi cập nhật trạng thái dịch vụ',
      );
    }
  }
}
