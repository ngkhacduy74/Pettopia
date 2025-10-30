import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Service, ServiceDocument } from '../../schemas/clinic/service.schema';
import { CreateServiceDto } from 'src/dto/clinic/create-service.dto';

@Injectable()
export class ServiceRepository {
  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
  ) {}

  async createService(
    data: CreateServiceDto,
    clinic_id: string,
  ): Promise<Service> {
    try {
      const newService = new this.serviceModel({ ...data, clinic_id });
      const result = await newService.save();
      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi tạo dịch vụ',
      );
    }
  }

  async getAllService(
    page: number,
    limit: number,
  ): Promise<{
    data: Service[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.serviceModel.find().skip(skip).limit(limit).lean().exec(),
        this.serviceModel.countDocuments(),
      ]);
      return { data, total, page, limit };
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi lấy danh sách dịch vụ',
      );
    }
  }

  async updateService(
    serviceId: string,
    updateServiceDto: any,
    clinic_id: string,
  ): Promise<Service | null> {
    try {
      const result = await this.serviceModel.findOneAndUpdate(
        { _id: serviceId, clinic_id },
        { $set: updateServiceDto },
        { new: true },
      );

      if (!result) {
        throw new InternalServerErrorException(
          'Không tìm thấy dịch vụ cần cập nhật',
        );
      }

      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi cập nhật dịch vụ',
      );
    }
  }

  async removeService(serviceId: string, clinic_id: string): Promise<any> {
    try {
      const result = await this.serviceModel.deleteOne({
        _id: serviceId,
        clinic_id,
      });

      if (result.deletedCount === 0) {
        throw new InternalServerErrorException('Không tìm thấy dịch vụ để xóa');
      }

      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi xóa dịch vụ',
      );
    }
  }

  async updateServiceStatus(id: string, is_active: boolean): Promise<Service> {
    try {
      const result = await this.serviceModel.findByIdAndUpdate(
        id,
        { is_active },
        { new: true },
      );

      if (!result) {
        throw new InternalServerErrorException(
          'Không tìm thấy dịch vụ cần cập nhật trạng thái',
        );
      }

      return result;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi cập nhật trạng thái dịch vụ',
      );
    }
  }
  async getServicesByClinicId(clinic_id: string): Promise<Service[]> {
    try {
      const services = await this.serviceModel
        .find({ clinic_id: clinic_id })
        .lean()
        .exec();
      return services;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi truy vấn dịch vụ theo phòng khám',
      );
    }
  }
  async getServiceById(id: string): Promise<Service | null> {
    try {
      const service = await this.serviceModel.findById(id).lean().exec();
      return service;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Lỗi cơ sở dữ liệu khi truy vấn dịch vụ theo ID',
      );
    }
  }
}
