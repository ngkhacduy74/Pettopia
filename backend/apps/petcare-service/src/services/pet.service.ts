import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  InternalServerErrorException,
  HttpStatus,
} from '@nestjs/common';
import { createRpcError } from '../common/error.detail';
import { PetRepository } from '../repositories/pet.repository';
import { CreatePetDto } from '../dto/pet/create-pet.dto';
import { UpdatePetDto } from 'src/dto/pet/update-pet.dto';
import { PetResponseDto } from '../dto/pet/pet-response.dto';
import { GetAllPetsDto } from '../dto/pet/get-all-pets.dto';
import { Pet, PetSource } from '../schemas/pet.schema';
import { v4 as uuidv4 } from 'uuid';
import { identity, lastValueFrom } from 'rxjs';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { mapToResponseDto } from '../dto/response/pet.response';
import { CreateIdentificationDto } from 'src/dto/pet/create-indentify.dto';
import { generatePetId } from 'src/common/id_identify.common';
import { IdentifyService } from './identification.service';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class PetService {
  constructor(
    private readonly petRepository: PetRepository,
    private readonly identifyService: IdentifyService,
    @Inject('CUSTOMER_SERVICE') private customerClient: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('HEALTHCARE_SERVICE') private readonly healthcareClient: ClientProxy,
    private readonly configService: ConfigService,
  ) { }
  async create(payload: CreatePetDto & { fileBuffer?: string }): Promise<PetResponseDto | any> {
    try {
      //  Kiểm tra user tồn tại
      const user = await lastValueFrom(
        this.customerClient.send({ cmd: 'getUserById' }, { id: payload.user_id }),
      );
      if (!user) throw createRpcError(HttpStatus.NOT_FOUND, 'User not found', 'Not Found');

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
        if (!imageUrl) throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload image to Cloudinary', 'Internal Server Error');
      }

      // Determine Source & Claims
      const source = payload.source || PetSource.USER;
      // Default: USER -> claimed=true; CLINIC -> claimed=false (unless forced)
      const isClaimed = payload.isClaimed !== undefined
        ? payload.isClaimed
        : (source === PetSource.USER);

      // Check Quota if USER source
      if (source === PetSource.USER) {
        // VIP User has no limit or higher limit (skip check if is_vip)
        if (!user.is_vip) {
          const userPets = await this.petRepository.findByOwnerId(user.id);
          const count = userPets.filter(p => !p.source || p.source === PetSource.USER).length;
          if (count >= 3) {
            throw createRpcError(HttpStatus.BAD_REQUEST, 'Bạn đã đạt giới hạn 3 thú cưng. Vui lòng nâng cấp tài khoản hoặc xóa bớt.', 'Bad Request');
          }
        }
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
        source,
        isClaimed,
        avatar_url: imageUrl,
        owner: ownerData,
        dateOfBirth: new Date(payload.dateOfBirth),
      };

      // 5️⃣ Lưu Pet vào DB
      const pet = await this.petRepository.create(petData);
      if (!pet) throw new BadRequestException('Failed to create pet');
      // Generate QR với URL public chi tiết pet
      const domain = this.configService.get<string>('API_GATEWAY_PORT_OUT', 'http://localhost:3333');
      const publicUrl = `${domain}/api/v1/pet/${pet.id}/info`;
      const qrBuffer = await QRCode.toBuffer(publicUrl, {
        errorCorrectionLevel: 'H',  // Độ bền cao
        type: 'png',
        margin: 1,
        color: { dark: '#000', light: '#FFF' }
      });
      // Upload QR buffer lên Cloudinary 
      const uploadResponse = await lastValueFrom(
        this.authClient.send({ cmd: 'upload_image' }, { fileBuffer: qrBuffer.toString('base64') }),
      );
      const qrUrl = uploadResponse?.secure_url;
      if (!qrUrl) throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload QR code', 'Internal Server Error');

      // Update pet với QR URL
      await this.petRepository.update(pet.id, { qr_code_url: qrUrl });
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
        pet, qr_code_url: qrUrl,
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
          throw createRpcError(HttpStatus.FORBIDDEN, 'Bạn không có quyền xem thú cưng này', 'Forbidden');
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
          // Determine if user is allowed to see sensitive info (Owner, Vet, Admin, Staff, Clinic)
          const roles = Array.isArray(role) ? role : (role ? [role] : []);
          const allowedRoles = ['Admin', 'Staff', 'Vet', 'Clinic'];
          const hasPrivilege = roles.some((r) => allowedRoles.includes(r));
          const isOwner = userId && pet.owner.user_id === userId;

          const shouldUnmask = hasPrivilege || isOwner;

          petResponse.medical_records = medicalRecords.data.map((record: any) => {
            if (!shouldUnmask && record.medicalRecord) {
              const { clinic_id, vet_id, ...rest } = record.medicalRecord;
              return {
                ...record,
                medicalRecord: rest,
              };
            }
            return record;
          });
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
          throw createRpcError(HttpStatus.FORBIDDEN, 'Bạn không có quyền cập nhật thú cưng này', 'Forbidden');
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
        if (!newImageUrl) throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload image to Cloudinary', 'Internal Server Error');

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
      // Filter only USER pets (claimed/owned)
      return pets
        .filter(p => !p.source || p.source === PetSource.USER)
        .map((pet) => mapToResponseDto(pet));
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

      // Kiểm tra pet có tồn tại không
      const existingPet = await this.petRepository.findById(pet_id);
      if (!existingPet) {
        throw new NotFoundException(`Pet with ID ${pet_id} not found`);
      }

      // Verify ownership: User chỉ được xóa pet của chính mình
      // Admin/Staff có thể xóa bất kỳ pet nào
      if (!isAdminOrStaff && userId) {
        if (existingPet.owner.user_id !== userId) {
          throw createRpcError(HttpStatus.FORBIDDEN, 'Bạn không có quyền xóa thú cưng này', 'Forbidden');
        }
      }

      // Xóa căn cước (Identification) tương ứng
      try {
        const deletedIdentify =
          await this.identifyService.deleteIdentificationByPetId(pet_id);

        if (!deletedIdentify) {
          throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, 'Không thể xoá căn cước của thú cưng này!', 'Internal Server Error');
        }
      } catch (err) {
        // Nếu lỗi khi xoá căn cước → log nhưng vẫn tiếp tục xoá pet
        console.warn('⚠️ Failed to delete identification:', err.message);
      }

      //  Xoá pet trong repository
      const deletedPet = await this.petRepository.delete(pet_id);
      if (!deletedPet) {
        throw createRpcError(HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete pet from repository', 'Internal Server Error');
      }


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
  async getPublicPetInfo(pet_id: string): Promise<PetResponseDto> {
    try {
      const pet = await this.petRepository.findById(pet_id);
      if (!pet) {
        throw new NotFoundException(`Pet with ID ${pet_id} not found`);
      }

      const petResponse = mapToResponseDto(pet);

      // Fetch medical records (public version)
      try {
        const medicalRecords = await lastValueFrom(
          this.healthcareClient.send(
            { cmd: 'getMedicalRecordsByPet' },
            { petId: pet_id },
            // Không gửi role → healthcare service nên trả version public
          ),
        );

        if (medicalRecords && medicalRecords.data) {
          // Ẩn thông tin nhạy cảm cho public (clinic_id, vet_id)
          petResponse.medical_records = medicalRecords.data.map((record: any) => {
            if (record.medicalRecord) {
              const { clinic_id, vet_id, ...rest } = record.medicalRecord;
              return {
                ...record,
                medicalRecord: rest,
              };
            }
            return record;
          });
        }
      } catch (err) {
        console.warn(`Failed to fetch medical records for public pet ${pet_id}:`, err.message);
        petResponse.medical_records = [];
      }

      // Optional: Ẩn thông tin owner nhạy cảm (phone, email, address) cho public
      petResponse.owner = {
        user_id: pet.owner.user_id,
        fullname: pet.owner.fullname,
        // phone: undefined, email: undefined, address: undefined → nếu muốn ẩn
      };

      return petResponse;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to fetch public pet info');
    }
  }
  async claimPet(data: { userId: string, petId: string }): Promise<PetResponseDto> {
    const { userId, petId } = data;
    const pet = await this.petRepository.findById(petId);
    if (!pet) throw new NotFoundException('Pet not found');

    if (pet.owner.user_id !== userId) {
      throw createRpcError(HttpStatus.FORBIDDEN, 'Not owner', 'Forbidden');
    }

    if (pet.source === PetSource.USER && pet.isClaimed) {
      throw createRpcError(HttpStatus.BAD_REQUEST, 'Pet already claimed', 'Bad Request');
    }

    // Check User VIP Status
    const user = await lastValueFrom(
      this.customerClient.send({ cmd: 'getUserById' }, { id: userId }),
    );
    if (!user) throw createRpcError(HttpStatus.NOT_FOUND, 'User not found', 'Not Found');

    if (!user.is_vip) {
      // Check Quota
      const userPets = await this.petRepository.findByOwnerId(userId);
      const count = userPets.filter(p => !p.source || p.source === PetSource.USER).length;
      if (count >= 3) {
        throw createRpcError(HttpStatus.BAD_REQUEST, 'Quota exceeded. Upgrade to VIP to claim more pets.', 'Bad Request');
      }
    }

    // Update
    const updated = await this.petRepository.update(petId, {
      source: PetSource.USER,
      isClaimed: true,
    } as any);

    if (!updated) throw new BadRequestException('Failed to update pet claim status');
    return mapToResponseDto(updated);
  }
}