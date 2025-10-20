import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { PetRepository } from '../repositories/pet.repository';
import { CreatePetDto } from '../dto/pet/create-pet.dto';
import { UpdatePetDto } from 'src/dto/pet/update-pet.dto';
import { PetResponseDto } from '../dto/pet/pet-response.dto';
import { Pet } from '../schemas/pet.schema';
import { v4 as uuidv4 } from 'uuid';
import { identity, lastValueFrom } from 'rxjs';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { mapToResponseDto } from '../dto/response/pet.response';
import { CreateIdentificationDto } from 'src/dto/pet/create-indentify.dto';
import { generatePetId } from 'src/common/id_identify.common';
import { IdentifyService } from './identification.service';

@Injectable()
export class PetService {
  constructor(
    private readonly petRepository: PetRepository,
    private readonly identifyService: IdentifyService,
    @Inject('CUSTOMER_SERVICE') private customerClient: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}
  async create(payload: CreatePetDto & { fileBuffer?: string }): Promise<PetResponseDto | any> {
  try {
    // 1️⃣ Kiểm tra user tồn tại
    const user = await lastValueFrom(
      this.customerClient.send({ cmd: 'getUserById' }, { id: payload.user_id }),
    );
    if (!user) throw new RpcException('User not found');

    // 2️⃣ Upload ảnh (nếu có)
    let imageUrl = payload.avatar_url;
    if (payload.fileBuffer) {
      const uploadResponse = await lastValueFrom(
        this.authClient.send({ cmd: 'upload_image' }, { fileBuffer: payload.fileBuffer }),
      );
      imageUrl = uploadResponse?.secure_url;
      if (!imageUrl) throw new RpcException('Failed to upload image to Cloudinary');
    }

      // 3️⃣ Chuẩn bị dữ liệu owner
      const ownerData = {
        user_id: user.id,
        fullname: user.fullname,
        phone: user.phone.phone_number,
        email: user.email.email_address,
        address: user.address,
      };

      // 4️⃣ Chuẩn bị dữ liệu Pet
      const petData = {
        id: uuidv4(),
        ...payload,
        avatar_url: imageUrl,
        owner: ownerData,
        dateOfBirth: new Date(payload.dateOfBirth),
      };

      // 5️⃣ Lưu Pet vào DB
      const pet = await this.petRepository.create(petData);
      if (!pet) throw new BadRequestException('Failed to create pet');

      // 6️⃣ Tạo căn cước
      const identifyData = {
        pet_id: petData.id,
        fullname: payload.name,
        gender: payload.gender,
        date_of_birth: payload.dateOfBirth,
        species: payload.species,
        color: payload.color,
        address: ownerData.address,
        avatar_url: imageUrl,
      };
      const createIdentifies = await this.identifyService.createIndentification(identifyData);

      if (!createIdentifies) {
        throw new InternalServerErrorException('Failed to create identification');
      }

      // 7️⃣ Trả về kết quả
      return {
        message: 'Tạo thú cưng thành công',
        statusCode: 201,
        pet,
        identifies: createIdentifies,
      };
    } catch (error) {
      console.error('❌ Error creating pet:', error);
      throw new BadRequestException('Failed to create pet: ' + error.message);
    }
  }


  async findAll(): Promise<PetResponseDto[]> {
    try {
      const pets = await this.petRepository.findAll();
      return pets.map((pet) => mapToResponseDto(pet));
    } catch (error) {
      throw new BadRequestException('Failed to fetch pets: ' + error.message);
    }
  }

  async findById(pet_id: string): Promise<PetResponseDto> {
    try {
      const pet = await this.petRepository.findById(pet_id);
      if (!pet) {
        throw new NotFoundException(`Pet with ID ${pet_id} not found`);
      }
      return mapToResponseDto(pet);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch pet: ' + error.message);
    }
  }

  // async update(pet_id: string, updatePetDto: UpdatePetDto): Promise<PetResponseDto> {
  //   try {
  //     const updateData = { ...updatePetDto };
  //     if (updatePetDto.dateOfBirth) {
  //       updateData.dateOfBirth = new Date(updatePetDto.dateOfBirth);
  //     }

  //     const pet = await this.petRepository.update(pet_id, updateData);
  //     if (!pet) {
  //       throw new NotFoundException(`Pet with ID ${pet_id} not found`);
  //     }
  //     return this.mapToResponseDto(pet);
  //   } catch (error) {
  //     if (error instanceof NotFoundException) {
  //       throw error;
  //     }
  //     throw new BadRequestException('Failed to update pet: ' + error.message);
  //   }
  // }
  async update(pet_id: string, updatePetDto: UpdatePetDto, file?: Express.Multer.File): Promise<any> {
  try {
    const updateData = { ...updatePetDto };
    if (updatePetDto.dateOfBirth) {
      updateData.dateOfBirth = new Date(updatePetDto.dateOfBirth);
    }

    // Upload ảnh mới nếu có
    if (file) {
      const uploadResponse = await lastValueFrom(
        this.authClient.send({ cmd: 'upload_image' }, file.path),
      );
      updateData.avatar_url = uploadResponse?.secure_url;
    }

    const pet = await this.petRepository.update(pet_id, updateData);
    if (!pet) throw new NotFoundException(`Pet with ID ${pet_id} not found`);

    // Cập nhật Identification tương ứng
    const identifyUpdateData = {
      fullname: updateData.name,
      gender: updateData.gender,
      date_of_birth: updateData.dateOfBirth,
      species: updateData.species,
      color: updateData.color,
      address: pet.owner?.address,
      avatar_url: updateData.avatar_url,
    };

    const updatedIdentify = await this.identifyService.updateIdentificationByPetId(
      pet_id,
      identifyUpdateData,
    );

    return {
      message: 'Cập nhật thú cưng và căn cước thành công!',
      statusCode: 200,
      pet,
      identifies: updatedIdentify.data,
    };
  } catch (error) {
    console.error('❌ Error updating pet:', error);
    if (error instanceof NotFoundException) throw error;
    throw new BadRequestException('Failed to update pet: ' + error.message);
  }
}
async findByOwnerId(user_id: string): Promise<PetResponseDto[]> {
  try {
    const pets = await this.petRepository.findByOwnerId(user_id);
    return pets.map((pet) => mapToResponseDto(pet));
  } catch (error) {
    throw new BadRequestException(
      'Failed to fetch pets by owner: ' + error.message,
    );
  }
}

  async delete(pet_id: string): Promise<{ message: string }> {
  try {
    // 1️⃣ Kiểm tra pet có tồn tại không
    const existingPet = await this.petRepository.findById(pet_id);
    if (!existingPet) {
      throw new NotFoundException(`Pet with ID ${pet_id} not found`);
    }

    // 2️⃣ Xóa căn cước (Identification) tương ứng
    try {
      const deletedIdentify =
        await this.identifyService.deleteIdentificationByPetId(pet_id);

      if (!deletedIdentify) {
        throw new RpcException('Không thể xoá căn cước của thú cưng này!');
      }
    } catch (err) {
      // Nếu lỗi khi xoá căn cước → log nhưng vẫn tiếp tục xoá pet
      console.warn('⚠️ Failed to delete identification:', err.message);
    }

    // 3️⃣ Xoá pet trong repository
    const deletedPet = await this.petRepository.delete(pet_id);
    if (!deletedPet) {
      throw new RpcException('Failed to delete pet from repository');
    }

    // 4️⃣ Trả kết quả
    return { message: 'Đã xoá thú cưng và căn cước thành công!' };
  } catch (error) {
    if (error instanceof NotFoundException) throw error;
    throw new BadRequestException('Failed to delete pet: ' + error.message);
  }
}

  async findBySpecies(species: string): Promise<PetResponseDto[]> {
    try {
      const pets = await this.petRepository.findBySpecies(species);
      return pets.map((pet) => mapToResponseDto(pet));
    } catch (error) {
      throw new BadRequestException(
        'Failed to fetch pets by species: ' + error.message,
      );
    }
  }

  async getPetCount(): Promise<{ count: number }> {
    try {
      const count = await this.petRepository.count();
      return { count };
    } catch (error) {
      throw new BadRequestException(
        'Failed to get pet count: ' + error.message,
      );
    }
  }
}