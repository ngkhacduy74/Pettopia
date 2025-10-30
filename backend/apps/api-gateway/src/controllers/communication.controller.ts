import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('api/v1/communication')
export class CommunicationController {
  constructor(
    @Inject('COMMUNICATION_SERVICE')
    private readonly communicationService: ClientProxy,
  ) {}

  // CREATE POST
  @Post('/create')
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
  ) {
    // CHUYỂN BUFFER → BASE64 (như Pet)
    const fileBuffers = files?.map((f) => f.buffer.toString('base64')) || [];

    return await lastValueFrom(
      this.communicationService.send(
        { cmd: 'createPost' },
        { ...data, files: fileBuffers }, // Gửi mảng base64 string
      ),
    );
  }

  // GET ALL POSTS
  @Get('/all')
  async getAllPosts() {
    return await lastValueFrom(
      this.communicationService.send({ cmd: 'getAllPosts' }, {}),
    );
  }

  // GET POST BY ID
  @Get('/:id')
  async getPostById(@Param('id') post_id: string) {
    return await lastValueFrom(
      this.communicationService.send({ cmd: 'getPostById' }, { post_id }),
    );
  }

  // UPDATE POST
  @Patch('/:id')
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/image\/(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  @HttpCode(HttpStatus.OK)
  async updatePost(
    @UploadedFiles() files: Express.Multer.File[],
    @Param('id') post_id: string,
    @Body() updateData: any,
  ) {
    // CHUYỂN BUFFER → BASE64 (như Pet)
    const fileBuffers = files?.map((f) => f.buffer.toString('base64')) || [];

    return await lastValueFrom(
      this.communicationService.send(
        { cmd: 'updatePost' },
        { post_id, updateData, files: fileBuffers },
      ),
    );
  }

  // DELETE POST
  @Delete('/:id')
  @HttpCode(HttpStatus.OK)
  async deletePost(@Param('id') post_id: string) {
    return await lastValueFrom(
      this.communicationService.send({ cmd: 'deletePost' }, { post_id }),
    );
  }
  @Post(':id/like')
  async likePost(
    @Param('id') post_id: string,
    @Body('user_id') user_id: string,
  ) {
    return await lastValueFrom(
      this.communicationService.send(
        { cmd: 'likePost' },
        { post_id, user_id },
      ),
    );
  }

  @Delete(':id/like')
  async unlikePost(
    @Param('id') post_id: string,
    @Body('user_id') user_id: string,
  ) {
    return await lastValueFrom(
      this.communicationService.send(
        { cmd: 'likePost' },
        { post_id, user_id },
      ),
    );
  }

  // MỚI: ADD COMMENT
  @Post(':id/comment')
  async addComment(
    @Param('id') post_id: string,
    @Body() body: { user_id: string; content: string },
  ) {
    return await lastValueFrom(
      this.communicationService.send(
        { cmd: 'addComment' },
        { post_id, user_id: body.user_id, content: body.content },
      ),
    );
  }

  // MỚI: DELETE COMMENT
  @Delete(':id/comment/:comment_id')
  async deleteComment(
    @Param('id') post_id: string,
    @Param('comment_id') comment_id: string,
    @Body('user_id') user_id: string,
  ) {
    return await lastValueFrom(
      this.communicationService.send(
        { cmd: 'deleteComment' },
        { post_id, comment_id, user_id },
      ),
    );
  }
}