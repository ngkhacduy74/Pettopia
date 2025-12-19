// src/controllers/post.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PostService } from '../services/post.service';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';

@Controller()
export class PostController {
  private readonly logger = new Logger(PostController.name);

  constructor(private readonly postService: PostService) {}

  @MessagePattern({ cmd: 'createPost' })
  async createPost(
    @Payload() data: CreatePostDto & { files?: string[] }, // ĐÃ SỬA
  ): Promise<any> {
    try {
      this.logger.log(`Received createPost: ${JSON.stringify(data)}`);
      return await this.postService.create(data);
    } catch (error) {
      this.logger.error('Error creating post:', error);
      return { message: 'Failed to create post', error: error.message } as any;
    }
  }

  @MessagePattern({ cmd: 'getAllPosts' })
  async getAllPosts() {
    try {
      this.logger.log('Received getAllPosts');
      return await this.postService.findAll();
    } catch (error) {
      this.logger.error('Error fetching posts:', error);
      return [{ message: 'Failed to fetch posts', error: error.message }] as any;
    }
  }
  @MessagePattern({ cmd: 'getPostsByUserId' })
async getPostsByUserId(@Payload() data: { user_id: string }) {
  try {
    this.logger.log(`Fetching posts for user: ${data.user_id}`);
    return await this.postService.findByUserId(data.user_id);
  } catch (error) {
    this.logger.error('Error fetching user posts:', error);
    return { message: 'Failed to fetch user posts', error: error.message } as any;
  }
}

  @MessagePattern({ cmd: 'getPostById' })
  async getPostById(@Payload() data: { post_id: string }) {
    try {
      this.logger.log(`Received getPostById: ${data.post_id}`);
      return await this.postService.findById(data.post_id);
    } catch (error) {
      this.logger.error('Error fetching post by ID:', error);
      return { message: 'Failed to fetch post', error: error.message } as any;
    }
  }

  @MessagePattern({ cmd: 'updatePost' })
  async updatePost(
    @Payload()
    data: {
      post_id: string;
      updateData: UpdatePostDto;
      files?: string[];
      userId?: string;
      role?: string | string[];
      isAdminOrStaff?: boolean;
    },
  ) {
    try {
      this.logger.log(`Received updatePost: ${data.post_id}`);
      return await this.postService.update(data);
    } catch (error) {
      this.logger.error('Error updating post:', error);
      return { message: 'Failed to update post', error: error.message } as any;
    }
  }

  @MessagePattern({ cmd: 'deletePost' })
  async deletePost(
    @Payload()
    data: {
      post_id: string;
      userId?: string;
      role?: string | string[];
      isAdminOrStaff?: boolean;
    },
  ) {
    try {
      this.logger.log(`Received deletePost: ${data.post_id}`);
      return await this.postService.delete(data);
    } catch (error) {
      this.logger.error('Error deleting post:', error);
      return { message: 'Failed to delete post', error: error.message } as any;
    }
  }
  // === MỚI: LIKE / UNLIKE ===
    @MessagePattern({ cmd: 'likePost' })
    async likePost(@Payload() data: { post_id: string; user_id: string }) {
      try {
        this.logger.log(`Received likePost: ${data.post_id} by ${data.user_id}`);
        return await this.postService.likePost(data.post_id, data.user_id);
      } catch (error) {
        this.logger.error('Error liking post:', error);
        return { message: 'Failed to like post', error: error.message } as any;
      }
    }

  // === MỚI: THÊM BÌNH LUẬN ===
  @MessagePattern({ cmd: 'addComment' })
  async addComment(
    @Payload() data: { post_id: string; user_id: string; content: string },
  ) {
    try {
      this.logger.log(`Received addComment on post: ${data.post_id}`);
      return await this.postService.addComment(data.post_id, data.user_id, data.content);
    } catch (error) {
      this.logger.error('Error adding comment:', error);
      return { message: 'Failed to add comment', error: error.message } as any;
    }
  }

  // === MỚI: XÓA BÌNH LUẬN ===
  @MessagePattern({ cmd: 'deleteComment' })
  async deleteComment(
    @Payload() data: { post_id: string; comment_id: string; user_id: string },
  ) {
    try {
      this.logger.log(`Received deleteComment: ${data.comment_id}`);
      return await this.postService.deleteComment(data.post_id, data.comment_id, data.user_id);
    } catch (error) {
      this.logger.error('Error deleting comment:', error);
      return { message: 'Failed to delete comment', error: error.message } as any;
    }
  }
  // === REPORT POST ===
@MessagePattern({ cmd: 'reportPost' })
async reportPost(
  @Payload() data: { post_id: string; user_id: string; reason: string },
) {
  try {
    this.logger.log(`User ${data.user_id} báo cáo bài viết ${data.post_id}`);
    const dto = { reason: data.reason };
    return await this.postService.reportPost(data.post_id, data.user_id, dto);
  } catch (error) {
    this.logger.error('Error reporting post:', error);
    return { message: 'Bạn đã báo cáo bài viết', error: error.message };
  }
}

// === LẤY BÀI BỊ REPORT (STAFF) ===
@MessagePattern({ cmd: 'getReportedPosts' })
async getReportedPosts() {
  try {
    this.logger.log('Staff requested reported posts');
    return await this.postService.getReportedPosts();
  } catch (error) {
    this.logger.error('Error fetching reported posts:', error);
    return { message: 'Failed to fetch reported posts', error: error.message };
  }
}

// === ẨN / BỎ ẨN BÀI VIẾT (STAFF) ===
@MessagePattern({ cmd: 'toggleHidePost' })
async toggleHidePost(
  @Payload() data: { post_id: string; isHidden: boolean; staff_id: string },
) {
  try {
    this.logger.log(`Staff ${data.staff_id} toggle hide post ${data.post_id}`);
    return await this.postService.toggleHidePost(data.post_id, data.isHidden, data.staff_id);
  } catch (error) {
    this.logger.error('Error toggling post visibility:', error);
    return { message: 'Failed to toggle post', error: error.message };
  }
}
}