// src/services/post.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { PostRepository } from '../repositories/post.repository';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { PostResponseDto } from '../dto/post-response.dto';
import { v4 as uuidv4 } from 'uuid';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { lastValueFrom, map } from 'rxjs';
import { mapToResponseDto } from '../response/post.response'; // ĐÚNG RỒI!
import { Post } from '../schemas/post.schemas';
import { ReportPostDto } from '../dto/report-post.dto';

@Injectable()
export class PostService {
  constructor(
    private readonly postRepository: PostRepository,
    @Inject('CUSTOMER_SERVICE') private readonly userClient: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  /**
   * CREATE POST
   */
  async create(
    payload: CreatePostDto & { files?: string[]; user_id?: string }, // base64 string[]
  ): Promise<any> {
    try {
      // 1. Lấy user - user_id có thể từ payload hoặc từ token
      const userId = payload.user_id;
      if (!userId) throw new RpcException('User ID is required');

      const user = await lastValueFrom(
        this.userClient.send({ cmd: 'getUserById' }, { id: userId }),
      );
      if (!user) throw new RpcException('User not found');

      // 2. Upload ảnh (nếu có)
      let imageUrls: string[] = [];
      if (payload.files && payload.files.length > 0) {
        const uploadPromises = payload.files.map(async (base64String) => {
          const buffer = Buffer.from(base64String, 'base64');
          const uploadResponse = await lastValueFrom(
            this.authClient.send(
              { cmd: 'upload_image' },
              { fileBuffer: buffer },
            ),
          );
          if (!uploadResponse?.secure_url)
            throw new RpcException('Failed to upload image to Cloudinary');
          return uploadResponse.secure_url;
        });
        imageUrls = await Promise.all(uploadPromises);
      }

      // 3. Tạo post data
      const postData: Partial<Post> = {
        post_id: uuidv4(),
        author: {
          user_id: userId,
          fullname: user.fullname,
          avatar: user.avatar_url || null,
        },
        title: payload.title,
        content: payload.content,
        tags: payload.tags || [],
        images: imageUrls,
        isHidden: false,
        likes: [],
        views: [],
        reports: [],
        comments: [],
        likeCount: 0,
        viewCount: 0,
        reportCount: 0,
        commentCount: 0,
      };

      // 4. Lưu DB
      const post = await this.postRepository.create(postData);
      if (!post) throw new InternalServerErrorException('Failed to create post');

      // 5. Trả về với DTO
      return {
        message: 'Tạo bài viết thành công!',
        statusCode: 201,
        post: mapToResponseDto(post), // DÙNG HÀM CỦA BẠN
      };
    } catch (error) {
      console.error('Error creating post:', error);
      throw new BadRequestException('Failed to create post: ' + error.message);
    }
  }

  /**
   * GET ALL
   */
  async findAll(): Promise<PostResponseDto[]> {
    const posts = await this.postRepository.findAll();
    return posts.map(mapToResponseDto); // DÙNG HÀM CỦA BẠN
  }

  /**
   * GET BY ID
   */
  async findById(post_id: string): Promise<PostResponseDto> {
    const post = await this.postRepository.findById(post_id);
    if (!post) throw new NotFoundException(`Post with ID ${post_id} not found`);
    return mapToResponseDto(post); // DÙNG HÀM CỦA BẠN
  }
/**
 * LẤY TẤT CẢ BÀI VIẾT CỦA 1 USER
 */
async findByUserId(user_id: string): Promise<PostResponseDto[]> {
  // DÙNG HÀM TRONG REPOSITORY
  const posts = await this.postRepository.findByAuthorId(user_id);
  
   return posts.map(mapToResponseDto)
}
  async update(
  payload: {
    post_id: string;
    updateData: UpdatePostDto;
    // BỎ files?: string[] vì không cần nữa
    userId?: string;
    role?: string | string[];
    isAdminOrStaff?: boolean;
  },
): Promise<any> {
  try {
    const { post_id, updateData, userId, isAdminOrStaff } = payload;

    const post = await this.postRepository.findById(post_id);
    if (!post) throw new NotFoundException(`Post with ID ${post_id} not found`);

    // Kiểm tra quyền
    if (!isAdminOrStaff && userId && post.author.user_id !== userId) {
      throw new RpcException({
        status: 403,
        message: 'Bạn không có quyền cập nhật bài viết này',
      });
    }
    // Frontend đã upload ảnh riêng và gửi danh sách URL đầy đủ
    const finalImages = Array.isArray(updateData.images)
      ? updateData.images
      : post.images || [];

    // Validation tổng số ảnh (tùy chọn)
    const MAX_IMAGES = 3;
    if (finalImages.length > MAX_IMAGES) {
      throw new BadRequestException(`Tối đa ${MAX_IMAGES} ảnh mỗi bài viết`);
    }

    const updatePayload: Partial<Post> = {
      title: updateData.title ?? post.title,
      content: updateData.content ?? post.content,
      tags: updateData.tags ?? post.tags,
      images: finalImages,
    };

    const updatedPost = await this.postRepository.update(post_id, updatePayload);

    return {
      message: 'Cập nhật bài viết thành công!',
      statusCode: 200,
      post: mapToResponseDto(updatedPost),
    };
  } catch (error) {
    console.error('Error updating post:', error);
    if (error instanceof RpcException) throw error;
    throw new BadRequestException('Failed to update post: ' + error.message);
  }
}

  /**
   * DELETE
   */
  async delete(payload: {
    post_id: string;
    userId?: string;
    role?: string | string[];
    isAdminOrStaff?: boolean;
  }): Promise<{ message: string }> {
    const { post_id, userId, isAdminOrStaff } = payload;

    const post = await this.postRepository.findById(post_id);
    if (!post) throw new NotFoundException(`Post with ID ${post_id} not found`);

    // Verify ownership: User chỉ được xóa post của chính mình
    // Admin/Staff có thể xóa bất kỳ post nào
    if (!isAdminOrStaff && userId) {
      const authorId =
        (post.author as any)?.user_id || (post.author as any)?.id;
      if (authorId !== userId) {
        throw new RpcException({
          status: 403,
          message: 'Bạn không có quyền xóa bài viết này',
        });
      }
    }

    const deleted = await this.postRepository.delete(post_id);
    if (!deleted) throw new NotFoundException(`Post with ID ${post_id} not found`);
    return { message: 'Xóa bài viết thành công!' };
  }
  // LIKE / UNLIKE
async likePost(post_id: string, user_id: string) {
  const post = await this.postRepository.findById(post_id);
  if (!post) throw new NotFoundException('Post not found');

  const likedIndex = post.likes.findIndex(l => l.user_id === user_id);
  if (likedIndex > -1) {
    // Unlike
    post.likes.splice(likedIndex, 1);
    post.likeCount = Math.max(0, post.likeCount - 1);
  } else {
    // Like
    post.likes.push({ user_id, likedAt: new Date() });
    post.likeCount += 1;
  }

  const updated = await this.postRepository.update(post_id, {
    likes: post.likes,
    likeCount: post.likeCount,
  });

  return {
    message: likedIndex > -1 ? 'Đã bỏ thích' : 'Đã thích',
    post: mapToResponseDto(updated),
  };
}

// ADD COMMENT
async addComment(post_id: string, user_id: string, content: string) {
  const post = await this.postRepository.findById(post_id);
  if (!post) throw new NotFoundException('Post not found');

  const user = await lastValueFrom(
    this.userClient.send({ cmd: 'getUserById' }, { id: user_id }),
  );

  const newComment = {
    comment_id: uuidv4(),
    author: {
      user_id: user.id,
      fullname: user.fullname,
      avatar: user.avatar_url || null,
    },
    content,
    likes: [],
    reports: [],
    isHidden: false,
    isDeleted: false,
    createdAt: new Date(),
  };

  post.comments.push(newComment);
  post.commentCount += 1;

  const updated = await this.postRepository.update(post_id, {
    comments: post.comments,
    commentCount: post.commentCount,
  });

  return {
    message: 'Bình luận thành công!',
    comment: newComment,
    post: mapToResponseDto(updated),
  };
}

// DELETE COMMENT
async deleteComment(post_id: string, comment_id: string, user_id: string) {
  const post = await this.postRepository.findById(post_id);
  if (!post) throw new NotFoundException('Post not found');

  const comment = post.comments.find(c => c.comment_id === comment_id);
  if (!comment) throw new NotFoundException('Comment not found');
  if (comment.author.user_id !== user_id) throw new BadRequestException('Không có quyền');

  comment.isDeleted = true;
  post.commentCount = Math.max(0, post.commentCount - 1);

  const updated = await this.postRepository.update(post_id, {
    comments: post.comments,
    commentCount: post.commentCount,
  });

  return { message: 'Đã xóa bình luận', post: mapToResponseDto(updated) };
}
// === REPORT POST ===
async reportPost(post_id: string, user_id: string, dto: ReportPostDto) {
  const post = await this.postRepository.findById(post_id);
  if (!post) throw new NotFoundException('Post not found');

  // Kiểm tra user đã report chưa
  const alreadyReported = post.reports.some(r => r.user_id === user_id);
  if (alreadyReported) {
    throw new BadRequestException('Bạn đã báo cáo bài viết này rồi');
  }

  const newReport = {
    user_id,
    reason: dto.reason,
    reportedAt: new Date(),
  };

  post.reports.push(newReport);
  post.reportCount += 1;

  const updated = await this.postRepository.update(post_id, {
    reports: post.reports,
    reportCount: post.reportCount,
  });

  return {
    message: 'Đã báo cáo bài viết thành công',
    reportCount: updated.reportCount,
  };
}
 // === LẤY DANH SÁCH BÀI VIẾT BỊ REPORT (dành cho Staff) ===
async getReportedPosts(): Promise<PostResponseDto[]> {
  const posts = await this.postRepository.findAll();

  // Chỉ lấy bài có ít nhất 1 report
  const reportedPosts = posts
    .filter(p => p.reportCount > 0)
    .sort((a, b) => b.reportCount - a.reportCount);

  return reportedPosts.map(mapToResponseDto);
}
// === ẨN / BỎ ẨN BÀI VIẾT (Staff only) ===
async toggleHidePost(post_id: string, isHidden: boolean, staff_id: string): Promise<any> {
  const post = await this.postRepository.findById(post_id);
  if (!post) throw new NotFoundException('Post not found');

  // Optional: Log hành động staff
  console.log(`Staff ${staff_id} ${isHidden ? 'ẩn' : 'bỏ ẩn'} bài viết ${post_id}`);

  const updated = await this.postRepository.update(post_id, { isHidden });

  return {
    message: isHidden ? 'Đã ẩn bài viết' : 'Đã bỏ ẩn bài viết',
    post: mapToResponseDto(updated),
  };
}
}