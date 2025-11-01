import { RpcException } from '@nestjs/microservices';
import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { CreateClinicFormDto } from 'src/dto/clinic/create-clinic-form.dto';
import { CreateClinicDto } from 'src/dto/clinic/create-clinic.dto';
import { CreateServiceDto } from 'src/dto/clinic/create-service.dto';
import { UpdateStatusClinicDto } from 'src/dto/clinic/update-status.dto';
import { ClinicsRepository } from 'src/repositories/clinic/clinic.repositories';
import { ServiceRepository } from 'src/repositories/clinic/service.repositories';
import { RegisterStatus } from 'src/schemas/clinic/clinic-register.schema';
import { createRpcError } from 'src/common/error.detail';

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
      const result = await this.clinicRepositories
        .createClinicForm(createClinicFormData)
        .catch((error) => {
          console.error('Error creating clinic form:', error);
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi tạo form đăng ký phòng khám',
            'Bad Request',
            error.message,
          );
        });

      if (!result) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Không thể tạo form đăng ký phòng khám',
          'Bad Request',
        );
      }

      return {
        status: 'success',
        message: 'Tạo form đăng ký phòng khám thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi tạo form đăng ký phòng khám',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async findClinicFormById(idForm: string): Promise<any> {
    try {
      const result = await this.clinicRepositories
        .findOneClinicForm(idForm)
        .catch((error) => {
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi tìm kiếm form đăng ký phòng khám',
            'Bad Request',
            error.message,
          );
        });

      if (!result) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          `Không tìm thấy form đăng ký phòng khám với ID: ${idForm}`,
          'Not Found',
        );
      }

      return {
        status: 'success',
        message: 'Lấy thông tin form đăng ký phòng khám thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi lấy thông tin form đăng ký phòng khám',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async updateStatusClincForm(
    updateStatus: UpdateStatusClinicDto,
  ): Promise<any> {
    try {
      const clinicForm = await this.clinicRepositories
        .findOneClinicForm(updateStatus.id)
        .catch((error) => {
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi tìm kiếm form đăng ký phòng khám',
            'Bad Request',
            error.message,
          );
        });

      if (!clinicForm) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy form đăng ký phòng khám',
          'Not Found',
        );
      }
      console.log('Clinic Form12312312:', clinicForm);
      const result = await this.clinicRepositories
        .updateStatusClinicForm(updateStatus)
        .catch((error) => {
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi cập nhật trạng thái đơn đăng ký',
            'Bad Request',
            error.message,
          );
        });

      if (!result) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Không thể cập nhật trạng thái đơn đăng ký phòng khám',
          'Bad Request',
        );
      }
      if (updateStatus.status === RegisterStatus.APPROVED) {
        try {
          const createDto: CreateClinicDto = {
            id: clinicForm.id,
            // creator_id: clinicForm.user_id,
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

          const createdClinic = await this.clinicRepositories
            .createClinic(createDto)
            .catch((error) => {
              throw createRpcError(
                HttpStatus.BAD_REQUEST,
                'Lỗi khi tạo phòng khám',
                'Bad Request',
                error.message,
              );
            });

          // if (createdClinic) {
          //   try {
          //     await lastValueFrom(
          //       this.customerService.send(
          //         { cmd: 'auto_add_user_role' },
          //         { userId: clinicForm.user_id, role: 'Clinic' },
          //       ),
          //     );
          //   } catch (error) {
          //     console.error('Error adding clinic role to user:', error);
          //   }
          // }

          return {
            status: 'success',
            message: 'Duyệt đơn thành công và đã tạo phòng khám',
            data: { register: result, clinic: createdClinic },
          };
        } catch (error) {
          await this.clinicRepositories
            .rollbackStatusToPending(result.id)
            .catch((rollbackError) => {
              console.error('Error rolling back status:', rollbackError);
            });

          throw createRpcError(
            HttpStatus.INTERNAL_SERVER_ERROR,
            `Tạo phòng khám thất bại, trạng thái đã được khôi phục: ${error.message}`,
            'Internal Server Error',
            error.message,
          );
        }
      }
      return {
        status: 'success',
        message: `Cập nhật trạng thái thành công: ${updateStatus.status}`,
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi cập nhật trạng thái đơn đăng ký phòng khám',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async updateClinicActiveStatus(id: string, is_active: boolean): Promise<any> {
    try {
      if (!id) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'ID phòng khám không được để trống',
          'Bad Request',
        );
      }

      const updatedClinic = await this.clinicRepositories
        .updateActiveStatus(id, is_active)
        .catch((error) => {
          console.error('Error updating clinic active status:', error);
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi cập nhật trạng thái hoạt động của phòng khám',
            'Bad Request',
            error.message,
          );
        });

      if (!updatedClinic) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          `Không tìm thấy phòng khám với ID: ${id}`,
          'Not Found',
        );
      }

      return {
        status: 'success',
        message: `Cập nhật trạng thái hoạt động của phòng khám ${id} thành công`,
        data: updatedClinic,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi cập nhật trạng thái hoạt động của phòng khám',
        'Internal Server Error',
        error.message,
      );
    }
  }
  async findAllClinic(page = 1, limit = 10): Promise<any> {
    try {
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.clinicRepositories.findAllClinic(skip, limit).catch((error) => {
          console.error('Error finding all clinics:', error);
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi tìm kiếm danh sách phòng khám',
            'Bad Request',
            error.message,
          );
        }),
        this.clinicRepositories.countAllClinic().catch((error) => {
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi đếm số lượng phòng khám',
            'Bad Request',
            error.message,
          );
        }),
      ]);

      return {
        status: 'success',
        message: 'Lấy danh sách phòng khám thành công',
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi lấy danh sách phòng khám',
        'Internal Server Error',
        error.message,
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
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        err.message || 'Lỗi khi lấy danh sách form đăng ký clinic',
        'Internal Server Error',
      );
    }
  }

  async createService(data: CreateServiceDto, clinic_id: string): Promise<any> {
    try {
      const result = await this.serviceRepositories.createService(
        data,
        clinic_id,
      );

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

      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        err.message || 'Lỗi không xác định khi tạo dịch vụ',
        'Internal Server Error',
      );
    }
  }

  async getAllService(page: number = 1, limit: number = 10): Promise<any> {
    try {
      const result = await this.serviceRepositories
        .getAllService(page, limit)
        .catch((error) => {
          console.error('Error getting all services:', error);
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi lấy danh sách dịch vụ',
            'Bad Request',
            error.message,
          );
        });

      return {
        status: 'success',
        message: 'Lấy danh sách dịch vụ thành công',
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
        data: result.data,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      console.error('Unexpected error in getAllService:', error);
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi lấy danh sách dịch vụ',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async updateService(
    serviceId: string,
    updateServiceDto: any,
    clinic_id: string,
  ): Promise<any> {
    try {
      if (!serviceId) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'ID dịch vụ không được để trống',
          'Bad Request',
        );
      }

      if (!updateServiceDto) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Dữ liệu cập nhật không được để trống',
          'Bad Request',
        );
      }

      const result = await this.serviceRepositories
        .updateService(serviceId, updateServiceDto, clinic_id)
        .catch((error) => {
          console.error('Error updating service:', error);
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi cập nhật dịch vụ',
            'Bad Request',
            error.message,
          );
        });

      if (!result) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy dịch vụ để cập nhật',
          'Not Found',
        );
      }

      return {
        status: 'success',
        message: 'Cập nhật dịch vụ thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      console.error('Unexpected error in updateService:', error);
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi cập nhật dịch vụ',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async removeService(serviceId: string, clinic_id: string): Promise<any> {
    try {
      if (!serviceId) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'ID dịch vụ không được để trống',
          'Bad Request',
        );
      }

      const result = await this.serviceRepositories
        .removeService(serviceId, clinic_id)
        .catch((error) => {
          console.error('Error removing service:', error);
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi xóa dịch vụ',
            'Bad Request',
            error.message,
          );
        });

      if (!result || result.deletedCount === 0) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy dịch vụ để xóa',
          'Not Found',
        );
      }

      return {
        status: 'success',
        message: 'Xóa dịch vụ thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      console.error('Unexpected error in removeService:', error);
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi xóa dịch vụ',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async updateServiceStatus(id: string, is_active: boolean): Promise<any> {
    try {
      if (!id) {
        throw createRpcError(
          400,
          'ID dịch vụ không được để trống',
          'Bad Request',
        );
      }

      const result = await this.serviceRepositories
        .updateServiceStatus(id, is_active)
        .catch((error) => {
          console.error('Error updating service status:', error);
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi cập nhật trạng thái dịch vụ',
            'Bad Request',
            error.message,
          );
        });

      if (!result) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy dịch vụ cần cập nhật trạng thái',
          'Not Found',
        );
      }

      return {
        status: 'success',
        message: `Cập nhật trạng thái dịch vụ thành công (${is_active ? 'Kích hoạt' : 'Vô hiệu hóa'})`,
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      console.error('Unexpected error in updateServiceStatus:', error);
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi cập nhật trạng thái dịch vụ',
        'Internal Server Error',
        error.message,
      );
    }
  }
  async getClinicById(id: string): Promise<any> {
    try {
      if (!id) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'ID phòng khám không được để trống',
          'Bad Request',
        );
      }

      const result = await this.clinicRepositories
        .getClinicById(id)
        .catch((error) => {
          console.error('Error getting clinic by ID:', error);
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi lấy thông tin phòng khám',
            'Bad Request',
            error.message,
          );
        });

      if (!result) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          `Không tìm thấy phòng khám với ID: ${id}`,
          'Not Found',
        );
      }

      return {
        status: 'success',
        message: 'Lấy thông tin phòng khám thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      console.error('Unexpected error in getClinicById:', error);
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi lấy thông tin phòng khám',
        'Internal Server Error',
        error.message,
      );
    }
  }
}
