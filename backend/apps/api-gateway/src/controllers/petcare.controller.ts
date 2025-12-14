import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
  UploadedFile,
  UseInterceptors,
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
  ) { }
  @Post('/create')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/image\/(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async createPet(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: any,
    @UserToken('id') userId: string,
  ) {
    const fileBufferString = file ? file.buffer.toString('base64') : undefined;
    return await lastValueFrom(
      this.petService.send(
        { cmd: 'createPet' },
        // Gửi chuỗi base64 đi, và inject user_id từ token
        { ...data, user_id: userId, fileBuffer: fileBufferString },
      ),
    );
  }
  @Get('/all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAllPets(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 15,
    @Query('search') search?: string,
    @Query('species') species?: string,
    @Query('gender') gender?: string,
    @Query('sort_field') sort_field?: string,
    @Query('sort_order') sort_order?: 'asc' | 'desc',
    @UserToken('id') userId: string,
    @UserToken('role') userRole: string | string[],
  ) {
    const roles = Array.isArray(userRole) ? userRole : [userRole];
    return await lastValueFrom(
      this.petService.send(
        { cmd: 'getAllPets' },
        {
          page: Number(page),
          limit: Number(limit),
          search,
          species,
          gender,
          sort_field,
          sort_order,
          userId,
          role: roles,
        },
      ),
    );
  }

  @Get('/count')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @HttpCode(HttpStatus.OK)
  async getPetCount() {
    return await lastValueFrom(
      this.petService.send({ cmd: 'getPetCount' }, {}),
    );
  }

  @Get('/:id')
  @UseGuards(JwtAuthGuard) // Ensure we have user info
  async getPetById(@Param('id') pet_id: string, @UserToken() user: any) {
    const role = user?.role;
    const userId = user?.id;
    return await lastValueFrom(
      this.petService.send({ cmd: 'getPetById' }, { pet_id, role, userId }),
    );
  }
  @Get('/owner/:user_id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.STAFF)
  @HttpCode(HttpStatus.OK)
  async getPetsByOwner(
    @Param('user_id') user_id: string,
    @UserToken('id') currentUserId: string,
    @UserToken('role') userRole: string | string[],
  ) {
    // Xử lý role có thể là string hoặc array
    const roles = Array.isArray(userRole) ? userRole : [userRole];
    const isAdminOrStaff =
      roles.includes(Role.ADMIN) || roles.includes(Role.STAFF);

    // User thường chỉ xem pets của chính mình
    // Admin/Staff có thể xem pets của bất kỳ user nào
    if (!isAdminOrStaff && user_id !== currentUserId) {
      throw new ForbiddenException(
        'Bạn không có quyền xem thú cưng của người dùng khác',
      );
    }

    return await lastValueFrom(
      this.petService.send({ cmd: 'getPetsByOwner' }, { user_id }),
    );
  }

  @Patch('/:id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.STAFF)
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/image\/(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  @HttpCode(HttpStatus.OK)
  async updatePet(
    @UploadedFile() file: Express.Multer.File,
    @Param('id') pet_id: string,
    @Body() updateData: any,
    @UserToken('id') currentUserId: string,
    @UserToken('role') userRole: string | string[],
  ) {
    const fileBufferString = file ? file.buffer.toString('base64') : undefined;
    const roles = Array.isArray(userRole) ? userRole : [userRole];
    const isAdminOrStaff =
      roles.includes(Role.ADMIN) || roles.includes(Role.STAFF);

    return await lastValueFrom(
      this.petService.send(
        { cmd: 'updatePet' },
        {
          pet_id,
          updateData,
          fileBuffer: fileBufferString,
          userId: currentUserId,
          role: roles,
          isAdminOrStaff,
        },
      ),
    );
  }

  @Delete('/:id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.STAFF)
  @HttpCode(HttpStatus.OK)
  async deletePet(
    @Param('id') pet_id: string,
    @UserToken('id') currentUserId: string,
    @UserToken('role') userRole: string | string[],
  ) {
    const roles = Array.isArray(userRole) ? userRole : [userRole];
    const isAdminOrStaff =
      roles.includes(Role.ADMIN) || roles.includes(Role.STAFF);

    return await lastValueFrom(
      this.petService.send(
        { cmd: 'deletePet' },
        { pet_id, userId: currentUserId, role: roles, isAdminOrStaff },
      ),
    );
  }
}
