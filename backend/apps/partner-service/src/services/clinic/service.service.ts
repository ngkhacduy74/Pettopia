import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { CreateServiceDto } from 'src/dto/clinic/create-service.dto';

import { ServiceRepository } from 'src/repositories/clinic/service.repositories';

@Injectable()
export class ServiceService {
  constructor(private readonly serviceRepositories: ServiceRepository) {}
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
  async getServicesByClinicId(clinic_id: string): Promise<any> {
    try {
      const result =
        await this.serviceRepositories.getServicesByClinicId(clinic_id);
      return {
        success: true,
        message: 'Lấy danh sách dịch vụ theo phòng khám thành công',
        data: result,
      };
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi khi lấy danh sách dịch vụ theo phòng khám',
      );
    }
  }
  async getServiceById(id: string): Promise<any> {
    try {
      const result = await this.serviceRepositories.getServiceById(id);
      return {
        success: true,
        message: 'Lấy thông tin dịch vụ thành công',
        data: result,
      };
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi khi lấy thông tin dịch vụ',
      );
    }
  }
}
