import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
   UploadedFile, UseInterceptors
} from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guard/jwtAuth.guard';
import { RoleGuard } from 'src/guard/role.guard';
import { UserToken } from 'src/decorators/user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('api/v1/pet')
export class PetController {
  constructor(
    @Inject('PETCARE_SERVICE') private readonly petService: ClientProxy,
  ) {}
 @Post('/create')
  @UseInterceptors(FileInterceptor('avatar', {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/image\/(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
      }
      cb(null, true);
    },
  }))
  @HttpCode(HttpStatus.CREATED)
  async createPet(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: any,
  ) {
    const fileBufferString = file ? file.buffer.toString('base64') : undefined;
    return await lastValueFrom(
      this.petService.send(
        { cmd: 'createPet' },
        // Gửi chuỗi base64 đi
        { ...data, fileBuffer: fileBufferString },
      ),
    );
  }
  @Get('/all')
  async getAllPets() {
    return await lastValueFrom(this.petService.send({ cmd: 'getAllPets' }, {}));
  }

  @Get('/count')
  async getPetCount() {
    return await lastValueFrom(
      this.petService.send({ cmd: 'getPetCount' }, {}),
    );
  }

  @Get('/:id')
  async getPetById(@Param('id') pet_id: string) {
    return await lastValueFrom(
      this.petService.send({ cmd: 'getPetById' }, { pet_id }),
    );
  }
  @Get('/owner/:user_id')
async getPetsByOwner(@Param('user_id') user_id: string) {
  return await lastValueFrom(
    this.petService.send({ cmd: 'getPetsByOwner' }, { user_id }),
  );
}
  
@Patch('/:id')
@UseInterceptors(FileInterceptor('avatar', {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/image\/(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
      }
      cb(null, true);
    },
  }))
  @HttpCode(HttpStatus.OK)
  async updatePet(
    @UploadedFile() file: Express.Multer.File,
    @Param('id') pet_id: string,
    @Body() updateData: any,
  ) {
    const fileBufferString = file ? file.buffer.toString('base64') : undefined;
    return await lastValueFrom(
      this.petService.send({ cmd: 'updatePet' }, { pet_id, updateData, fileBuffer: fileBufferString }),
    );
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.OK)
  async deletePet(@Param('id') pet_id: string) {
    return await lastValueFrom(
      this.petService.send({ cmd: 'deletePet' }, { pet_id }),
    );
  }
}
