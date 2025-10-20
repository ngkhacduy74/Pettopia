import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Identification,
  IdentificationDocument,
} from 'src/schemas/identification.schema';
import { CreateIdentificationDto } from 'src/dto/pet/create-indentify.dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class IdentificationRepository {
  constructor(
    @InjectModel(Identification.name)
    private identificationModel: Model<IdentificationDocument>,
  ) {}

  async create(data: any): Promise<any> {
    try {
      const saved = await this.identificationModel.create(data);
      return saved;
    } catch (err) {
      throw new RpcException(err.message || 'Không thể lưu identification');
    }
  }
async findByPetId(pet_id: string): Promise<Identification | null> {
  try {
    return await this.identificationModel.findOne({ pet_id });
  } catch (err) {
    throw new RpcException(err.message || 'Không thể tìm identification theo pet_id');
  }
}

async updateByPetId(pet_id: string, updateData: any): Promise<Identification | null> {
  try {
    return await this.identificationModel.findOneAndUpdate(
      { pet_id },
      updateData,
      { new: true },
    );
  } catch (err) {
    throw new RpcException(err.message || 'Không thể cập nhật identification theo pet_id');
  }
}

  async checkIdExist(id_identify: string): Promise<Identification | null> {
    try {
      return await this.identificationModel.findOne({
        identification_id: id_identify,
      });
    } catch (err) {
      throw new RpcException(err.message || 'Không thể check identification');
    }
  }
  async deleteByPetId(pet_id: string): Promise<boolean> {
  const result = await this.identificationModel.deleteOne({ pet_id });
  return result.deletedCount > 0;
}
}
