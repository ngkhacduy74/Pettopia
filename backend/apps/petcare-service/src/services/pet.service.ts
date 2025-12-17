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
import { GetAllPetsDto } from '../dto/pet/get-all-pets.dto';
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
    @Inject('HEALTHCARE_SERVICE') private readonly healthcareClient: ClientProxy,
  ) { }
  async create(payload: CreatePetDto & { fileBuffer?: string }): Promise<PetResponseDto | any> {
    try {
      //  Kiểm tra user tồn tại
      const user = await lastValueFrom(
        this.customerClient.send({ cmd: 'getUserById' }, { id: payload.user_id }),
      );
      if (!user) throw new RpcException('User not found');

      // Kiểm tra VIP status của user
      const vipStatus = await lastValueFrom(
        this.customerClient.send(
          { cmd: 'getVipRemainingDays' },
          { id: payload.user_id },
        ),
      );

      // Nếu không phải VIP, kiểm tra số lượng pet
      if (!vipStatus || !vipStatus.is_vip) {
        const currentPetCount = await this.petRepository.countByOwnerId(payload.user_id);
        if (currentPetCount >= 3) {
          throw new BadRequestException(
            'Tài khoản thường chỉ được tạo tối đa 3 thú cưng. Vui lòng nâng cấp VIP để tạo không giới hạn.',
          );
        }
      }

      // Upload ảnh (nếu có)
      let imageUrl = payload.avatar_url;
      if (payload.fileBuffer) {
        const uploadResponse = await lastValueFrom(
          this.authClient.send({ cmd: 'upload_image' }, { fileBuffer: payload.fileBuffer }),
        );
        imageUrl = uploadResponse?.secure_url;
        if (!imageUrl) throw new RpcException('Failed to upload image to Cloudinary');
      }

      // Chuẩn bị dữ liệu owner
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

  async getAllPets(
    data: GetAllPetsDto & { userId?: string; role?: string | string[] },
  ): Promise<any> {
    try {
      const roles = Array.isArray(data.role) ? data.role : [data.role];
      const isAdminOrStaff =
        roles.includes('Admin') || roles.includes('Staff');

      // User thường chỉ xem pets của chính mình
      // Admin/Staff có thể xem tất cả pets
      const filterData = { ...data };
      if (!isAdminOrStaff && data.userId) {
        // Filter theo owner nếu không phải admin/staff
        // Note: Repository sẽ xử lý filter này
      }

      const result = await this.petRepository.getAllPets(filterData);
      return {
        items: result.items.map((pet) => mapToResponseDto(pet)),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch pets: ' + error.message);
    }
  }

  async findById(pet_id: string, role?: string | string[], userId?: string): Promise<PetResponseDto> {
    try {
      const pet = await this.petRepository.findById(pet_id);
      if (!pet) {
        throw new NotFoundException(`Pet with ID ${pet_id} not found`);
      }

      // Check ownership
      const roles = Array.isArray(role) ? role : (role ? [role] : []);
      const privilegedRoles = ['Admin', 'Staff', 'Vet', 'Clinic'];
      const hasPrivilege = roles.some((r) => privilegedRoles.includes(r));

      if (!hasPrivilege && userId) {
        if (pet.owner.user_id !== userId) {
          throw new RpcException({
            status: 403,
            message: 'Bạn không có quyền xem thú cưng này',
          });
        }
      }

      const petResponse = mapToResponseDto(pet);

      // Fetch medical records from Healthcare Service
      try {
        const medicalRecords = await lastValueFrom(
          this.healthcareClient.send(
            { cmd: 'getMedicalRecordsByPet' },
            { petId: pet_id, role },
          ),
        );

        if (medicalRecords && medicalRecords.data) {
          petResponse.medical_records = medicalRecords.data;
        }
      } catch (err) {
        console.warn(`Failed to fetch medical records for pet ${pet_id}:`, err.message);
        // Don't fail the whole request if medical records fail
        petResponse.medical_records = [];
      }

      return petResponse;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof RpcException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch pet: ' + error.message);
    }
  }

  async findByIds(pet_ids: string[]): Promise<PetResponseDto[]> {
    try {
      if (!pet_ids || pet_ids.length === 0) {
        return [];
      }

      const pets = await this.petRepository.findByIds(pet_ids);
      return pets.map((pet) => mapToResponseDto(pet));
    } catch (error) {
      throw new BadRequestException('Failed to fetch pets: ' + error.message);
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
  async update(payload: {
    pet_id: string;
    updateData: UpdatePetDto;
    fileBuffer?: string;
    userId?: string;
    role?: string | string[];
    isAdminOrStaff?: boolean;
  }): Promise<any> {
    try {
      const {
        pet_id,
        updateData: updatePetDto,
        fileBuffer,
        userId,
        role,
        isAdminOrStaff,
      } = payload;

      // Kiểm tra quyền sở hữu
      const existingPet = await this.petRepository.findById(pet_id);
      if (!existingPet) {
        throw new NotFoundException(`Pet with ID ${pet_id} not found`);
      }

      // Verify ownership: User chỉ được update pet của chính mình
      // Admin/Staff có thể update bất kỳ pet nào
      if (!isAdminOrStaff && userId) {
        if (existingPet.owner.user_id !== userId) {
          throw new RpcException({
            status: 403,
            message: 'Bạn không có quyền cập nhật thú cưng này',
          });
        }
      }

      const updateData = { ...updatePetDto };
      if (updatePetDto.dateOfBirth) {
        updateData.dateOfBirth = new Date(updatePetDto.dateOfBirth);
      }

      // Upload ảnh mới nếu có
      let newImageUrl: string | undefined = undefined;
      if (fileBuffer) {
        const uploadResponse = await lastValueFrom(
          this.authClient.send({ cmd: 'upload_image' }, { fileBuffer: fileBuffer }),
        );
        newImageUrl = uploadResponse?.secure_url;
        if (!newImageUrl) throw new RpcException('Failed to upload image to Cloudinary');

        updateData.avatar_url = newImageUrl;
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
        avatar_url: newImageUrl ?? pet.avatar_url,
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

  async delete(payload: {
    pet_id: string;
    userId?: string;
    role?: string | string[];
    isAdminOrStaff?: boolean;
  }): Promise<{ message: string }> {
    try {
      const { pet_id, userId, isAdminOrStaff } = payload;

      // 1️⃣ Kiểm tra pet có tồn tại không
      const existingPet = await this.petRepository.findById(pet_id);
      if (!existingPet) {
        throw new NotFoundException(`Pet with ID ${pet_id} not found`);
      }

      // 2️⃣ Verify ownership: User chỉ được xóa pet của chính mình
      // Admin/Staff có thể xóa bất kỳ pet nào
      if (!isAdminOrStaff && userId) {
        if (existingPet.owner.user_id !== userId) {
          throw new RpcException({
            status: 403,
            message: 'Bạn không có quyền xóa thú cưng này',
          });
        }
      }

      // 3️⃣ Xóa căn cước (Identification) tương ứng
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

      // 4️⃣ Xoá pet trong repository
      const deletedPet = await this.petRepository.delete(pet_id);
      if (!deletedPet) {
        throw new RpcException('Failed to delete pet from repository');
      }

      // 5️⃣ Trả kết quả
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

  async addMedicalRecord(
    petId: string,
    medicalRecordId: string,
  ): Promise<PetResponseDto> {
    try {
      const pet = await this.petRepository.findById(petId);
      if (!pet) {
        throw new NotFoundException(`Pet with ID ${petId} not found`);
      }

      const currentRecords = pet.medical_records || [];
      if (!currentRecords.includes(medicalRecordId)) {
        const updatedPet = await this.petRepository.update(petId, {
          medical_records: [...currentRecords, medicalRecordId],
        } as any);

        if (!updatedPet) {
          throw new BadRequestException('Failed to update pet medical records');
        }
        return mapToResponseDto(updatedPet);
      }

      return mapToResponseDto(pet);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        'Failed to add medical record to pet: ' + error.message,
      );
    }
  }
}