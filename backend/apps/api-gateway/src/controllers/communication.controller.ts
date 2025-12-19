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
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/guard/jwtAuth.guard';
import { RoleGuard } from 'src/guard/role.guard';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { UserToken } from 'src/decorators/user.decorator';

@Controller('api/v1/communication')
export class CommunicationController {
  constructor(
    @Inject('COMMUNICATION_SERVICE')
    private readonly communicationService: ClientProxy,
  ) {}

  // CREATE POST
  @Post('/create')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB mỗi ảnh
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/image\/(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async createPost(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() data: any,
    @UserToken('id') userId: string,
  ) {
    // CHUYỂN BUFFER → BASE64 (như Pet)
    const fileBuffers = files?.map((f) => f.buffer.toString('base64')) || [];

    return await lastValueFrom(
      this.communicationService.send(
        { cmd: 'createPost' },
        { ...data, files: fileBuffers, user_id: userId }, // Gửi mảng base64 string và user_id từ token (không cần trong body)
      ),
    );
  }

  // GET ALL POSTS - Public nhưng có thể filter theo user nếu cần
  @Get('/all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAllPosts(@UserToken() user: any) {
    return await lastValueFrom(
      this.communicationService.send(
        { cmd: 'getAllPosts' },
        { userId: user?.id, role: user?.role },
      ),
    );
  }

  // GET POST BY ID - Public nhưng cần auth để track view
  @Get('/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getPostById(
    @Param('id') post_id: string,
    @UserToken('id') userId: string,
  ) {
    return await lastValueFrom(
      this.communicationService.send(
        { cmd: 'getPostById' },
        { post_id, userId },
      ),
    );
  }

  @Get('user/:user_id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.STAFF)
  @HttpCode(HttpStatus.OK)
  async getPostsByUserId(
    @Param('user_id') user_id: string,
    @UserToken('id') currentUserId: string,
    @UserToken('role') userRole: string | string[],
  ) {
    // User chỉ xem posts của chính mình, Admin/Staff xem được tất cả
    const roles = Array.isArray(userRole) ? userRole : [userRole];
    const isAdminOrStaff =
      roles.includes(Role.ADMIN) || roles.includes(Role.STAFF);

    if (!isAdminOrStaff && user_id !== currentUserId) {
      throw new ForbiddenException(
        'Bạn không có quyền xem bài viết của người dùng khác',
      );
    }

    return await lastValueFrom(
      this.communicationService.send(
        { cmd: 'getPostsByUserId' },
        { user_id },
      ),
    );
  }

  // UPDATE POST
  @Patch('/:id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.STAFF)
  @HttpCode(HttpStatus.OK)
  async updatePost(
    @UploadedFiles() files: Express.Multer.File[],
    @Param('id') post_id: string,
    @Body() updateData: any,
    @UserToken('id') currentUserId: string,
    @UserToken('role') userRole: string | string[],
  ) {
    // CHUYỂN BUFFER → BASE64 (như Pet)
    const fileBuffers = files?.map((f) => f.buffer.toString('base64')) || [];
    const roles = Array.isArray(userRole) ? userRole : [userRole];
    const isAdminOrStaff =
      roles.includes(Role.ADMIN) || roles.includes(Role.STAFF);

    return await lastValueFrom(
      this.communicationService.send(
        { cmd: 'updatePost' },
        {
          post_id,
          updateData,
          files: fileBuffers,
          userId: currentUserId,
          role: roles,
          isAdminOrStaff,
        },
      ),
    );
  }

  // DELETE POST
  @Delete('/:id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.STAFF)
  @HttpCode(HttpStatus.OK)
  async deletePost(
    @Param('id') post_id: string,
    @UserToken('id') currentUserId: string,
    @UserToken('role') userRole: string | string[],
  ) {
    const roles = Array.isArray(userRole) ? userRole : [userRole];
    const isAdminOrStaff =
      roles.includes(Role.ADMIN) || roles.includes(Role.STAFF);

    return await lastValueFrom(
      this.communicationService.send(
        { cmd: 'deletePost' },
        { post_id, userId: currentUserId, role: roles, isAdminOrStaff },
      ),
    );
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async likePost(
    @Param('id') post_id: string,
    @UserToken('id') userId: string,
  ) {
    return await lastValueFrom(
      this.communicationService.send(
        { cmd: 'likePost' },
        { post_id, user_id: userId },
      ),
    );
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unlikePost(
    @Param('id') post_id: string,
    @UserToken('id') userId: string,
  ) {
    return await lastValueFrom(
      this.communicationService.send(
        { cmd: 'likePost' },
        { post_id, user_id: userId },
      ),
    );
  }

  // MỚI: ADD COMMENT
  @Post(':id/comment')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async addComment(
    @Param('id') post_id: string,
    @Body('content') content: string,
    @UserToken('id') userId: string,
  ) {
    return await lastValueFrom(
      this.communicationService.send(
        { cmd: 'addComment' },
        { post_id, user_id: userId, content },
      ),
    );
  }

  // MỚI: DELETE COMMENT
  @Delete(':id/comment/:comment_id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteComment(
    @Param('id') post_id: string,
    @Param('comment_id') comment_id: string,
    @UserToken('id') userId: string,
  ) {
    return await lastValueFrom(
      this.communicationService.send(
        { cmd: 'deleteComment' },
        { post_id, comment_id, user_id: userId },
      ),
    );
  }

  // === REPORT POST (User) ===
  @Post(':id/report')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.USER, Role.ADMIN, Role.STAFF)
  @HttpCode(HttpStatus.OK)
  async reportPost(
    @Param('id') post_id: string,
    @Body() body: {reason: string},
    @UserToken('id') userId: string,
  ) {
    const { reason } = body;

  if (!reason || reason.trim() === '') {
    throw ('Lý do báo cáo là bắt buộc');
  }
    return await lastValueFrom(
      this.communicationService.send(
        { cmd: 'reportPost' },
        { post_id, user_id: userId, reason },
      ),
    );
  } 

  // === LẤY DANH SÁCH BÀI BỊ REPORT (Staff) ===
  @Get('staff/reported')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @HttpCode(HttpStatus.OK)
  async getReportedPosts() {
    return await lastValueFrom(
      this.communicationService.send({ cmd: 'getReportedPosts' }, {}),
    );
  }

  // === ẨN / BỎ ẨN BÀI VIẾT (Staff) ===
  @Patch(':id/hide')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @HttpCode(HttpStatus.OK)
  async toggleHidePost(
    @Param('id') post_id: string,
    @Body('isHidden') isHidden: boolean,
    @UserToken('id') staffId: string,
  ) {
    return await lastValueFrom(
      this.communicationService.send(
        { cmd: 'toggleHidePost' },
        { post_id, isHidden, staff_id: staffId },
      ),
    );
  }
}