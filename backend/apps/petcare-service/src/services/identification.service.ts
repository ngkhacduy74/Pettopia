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
}
