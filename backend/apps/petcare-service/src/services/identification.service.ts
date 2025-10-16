import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { generatePetId } from 'src/common/id_identify.common';
import { CreateIdentificationDto } from 'src/dto/pet/create-indentify.dto';
import { IdentificationRepository } from 'src/repositories/identification.repositories';
@Injectable()
export class IdentifyService {
  constructor(
    private readonly identificationRepositories: IdentificationRepository,
  ) {}
  async createIndentification(data: CreateIdentificationDto): Promise<any> {
    try {
      console.log('data1', data);
      const identifyData = {
        identification_id: generatePetId(),
        ...data,
      };

      const checkIdExist = await this.identificationRepositories.checkIdExist(
        identifyData.identification_id,
      );

      if (checkIdExist) {
        throw new RpcException('ID đã tồn tại. Vui lòng sử dụng ID khác');
      }

      const save = await this.identificationRepositories.create(identifyData);

      if (!save) {
        throw new RpcException('Chưa lưu được dữ liệu căn cước!');
      }

      return {
        message: 'Tạo căn cước thú cưng thành công!',
        data: save,
      };
    } catch (err) {
      throw new BadRequestException(
        'Failed to create identification: ' + err.message,
      );
    }
  }
  async updateIdentificationByPetId(
  pet_id: string,
  updateData: Partial<CreateIdentificationDto>,
): Promise<any> {
  try {
    const existingIdentify = await this.identificationRepositories.findByPetId(
      pet_id,
    );

    if (!existingIdentify) {
      throw new RpcException('Không tìm thấy căn cước cho thú cưng này!');
    }

    const updated = await this.identificationRepositories.updateByPetId(
      pet_id,
      updateData,
    );

    if (!updated) {
      throw new RpcException('Cập nhật căn cước thú cưng thất bại!');
    }

    return {
      message: 'Cập nhật căn cước thú cưng thành công!',
      data: updated,
    };
  } catch (err) {
    throw new BadRequestException(
      'Failed to update identification: ' + err.message,
    );
  }
}

}
