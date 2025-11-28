import { RpcException } from '@nestjs/microservices';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateServiceDto } from 'src/dto/clinic/services/create-service.dto';

import { ClinicService } from './clinic.service';
import { ClinicsRepository } from 'src/repositories/clinic/clinic.repositories';
import { ServiceRepository } from 'src/repositories/clinic/service.repositories';
import { createRpcError } from 'src/common/error.detail';


@Injectable()
export class ServiceService {
  constructor(
    private readonly serviceRepositories: ServiceRepository,
    private readonly clinicService: ClinicService,
    private readonly clinicRepositories: ClinicsRepository,
  ) { }

  async getAllServicesByClinicId(
    clinic_id: string,
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      console.log(';akd;kads;ad', clinic_id);
      if (!clinic_id) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Thiếu thông tin phòng khám',
          'Bad Request',
        );
      }

      const skip = (page - 1) * limit;

      const [services, total] = await Promise.all([
        this.serviceRepositories.findServicesByClinicId(clinic_id, skip, limit),
        this.serviceRepositories.countServicesByClinicId(clinic_id),
      ]);

      return {
        status: 'success',
        data: {
          items: services,
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
        'Lỗi khi lấy danh sách dịch vụ',
        'Internal Server Error',
        error.message,
      );
    }
  }
  async validateClinicServices(
    clinic_id: string,
    service_ids: string[],
  ): Promise<any[]> {
    try {
      if (!clinic_id || !service_ids?.length) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Thiếu thông tin phòng khám hoặc danh sách dịch vụ',
          'Bad Request',
        );
      }

      // Get all services for the clinic
      const services = await this.serviceRepositories.findServicesByClinicId(
        clinic_id,
        0,
        1000,
      );

      // Filter services that match the requested service_ids
      const validServices = services.filter(
        (service) =>
          service_ids.includes(service.id) && service.is_active !== false,
      );

      return validServices;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Lỗi khi xác thực dịch vụ',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async createService(data: CreateServiceDto, clinic_id: string): Promise<any> {
    try {
      const result = await this.serviceRepositories
        .createService(data, clinic_id)
        .catch((error) => {
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi tạo dịch vụ',
            'Bad Request',
            error.message,
          );
        });

      if (!result) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Không thể tạo mới dịch vụ',
          'Bad Request',
        );
      }
      const clinic_check =
        await this.clinicService.triggerToCheckActiveClinic(clinic_id);
      return {
        status: 'success',
        message: 'Tạo dịch vụ thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi tạo dịch vụ',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async getAllService(page: number = 1, limit: number = 10): Promise<any> {
    try {
      const result = await this.serviceRepositories
        .getAllService(page, limit)
        .catch((error) => {
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
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
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
      const result = await this.serviceRepositories
        .updateService(serviceId, updateServiceDto, clinic_id)
        .catch((error) => {
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
      throw createRpcError(
        500,
        'Đã xảy ra lỗi khi cập nhật dịch vụ',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async removeService(serviceId: string, clinic_id: string): Promise<any> {
    try {
      console.log('oiaud9871e');
      if (!serviceId || !clinic_id) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Thiếu thông tin bắt buộc',
          'Bad Request',
        );
      }

      const service = await this.serviceRepositories.getServiceById(serviceId);
      if (!service) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy dịch vụ',
          'Not Found',
        );
      }

      if (service.clinic_id.toString() !== clinic_id) {
        throw createRpcError(
          HttpStatus.FORBIDDEN,
          'Bạn không có quyền xóa dịch vụ này',
          'Forbidden',
        );
      }

      const result = await this.serviceRepositories
        .removeService(serviceId, clinic_id)
        .catch((error) => {
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

      const trigger =
        await this.clinicService.triggerToCheckActiveClinic(clinic_id);
      console.log('lkjaldkjasd', trigger);

      return {
        status: 'success',
        message: 'Xóa dịch vụ thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
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
      const result = await this.serviceRepositories
        .updateServiceStatus(id, is_active)
        .catch((error) => {
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
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi cập nhật trạng thái dịch vụ',
        'Internal Server Error',
        error.message,
      );
    }
  }
  async getServiceById(id: string): Promise<any> {
    try {
      const result = await this.serviceRepositories
        .getServiceById(id)
        .catch((error) => {
          console.error('Error getting service by ID:', error);
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Lỗi khi lấy thông tin dịch vụ',
            'Bad Request',
            error.message,
          );
        });

      if (!result) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Không tìm thấy dịch vụ',
          'Not Found',
        );
      }

      return {
        status: 'success',
        message: 'Lấy thông tin dịch vụ thành công',
        data: result,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi lấy thông tin dịch vụ',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async getServicesByClinicId(
    clinic_id: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    try {
      if (!clinic_id) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Thiếu thông tin phòng khám',
          'Bad Request',
        );
      }

      const result = await this.serviceRepositories.getServicesByClinicId(
        clinic_id,
        page,
        limit,
      );

      return {
        status: 'success',
        message: 'Lấy danh sách dịch vụ theo phòng khám thành công',
        data: {
          items: result.data,
          pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: Math.ceil(result.total / result.limit),
          },
        },
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi lấy danh sách dịch vụ theo phòng khám',
        'Internal Server Error',
        error.message,
      );
    }
  }
}
