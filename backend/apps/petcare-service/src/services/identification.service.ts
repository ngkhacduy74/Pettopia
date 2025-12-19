import { BadRequestException, Inject, Injectable, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { generatePetId } from 'src/common/id_identify.common';
import { CreateIdentificationDto } from 'src/dto/pet/create-indentify.dto';
import { IdentificationRepository } from 'src/repositories/identification.repositories';
import { createRpcError } from 'src/common/error.detail';
@Injectable()
export class IdentifyService {
  constructor(
    private readonly identificationRepositories: IdentificationRepository,
  ) { }
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
        throw createRpcError(HttpStatus.BAD_REQUEST, 'ID đã tồn tại. Vui lòng sử dụng ID khác', 'Bad Request');
      }

      const save = await this.identificationRepositories.create(identifyData);

      if (!save) {
        throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, 'Chưa lưu được dữ liệu căn cước!', 'Internal Server Error');
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
        throw createRpcError(HttpStatus.NOT_FOUND, 'Không tìm thấy căn cước cho thú cưng này!', 'Not Found');
      }

      const updated = await this.identificationRepositories.updateByPetId(
        pet_id,
        updateData,
      );

      if (!updated) {
        throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, 'Cập nhật căn cước thú cưng thất bại!', 'Internal Server Error');
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
  async deleteIdentificationByPetId(pet_id: string): Promise<{ message: string }> {
    try {
      const existingIdentify = await this.identificationRepositories.findByPetId(pet_id);
      if (!existingIdentify) {
        return { message: 'Không có căn cước nào liên kết với thú cưng này.' };
      }

      const deleted = await this.identificationRepositories.deleteByPetId(pet_id);
      if (!deleted) {
        throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, 'Xóa căn cước thất bại!', 'Internal Server Error');
      }

      return { message: 'Đã xóa căn cước của thú cưng thành công!' };
    } catch (err) {
      throw new BadRequestException('Failed to delete identification: ' + err.message);
    }
  }

}
