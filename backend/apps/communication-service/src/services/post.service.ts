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
import { lastValueFrom } from 'rxjs';
import { mapToResponseDto } from '../response/post.response'; // ĐÚNG RỒI!
import { Post } from '../schemas/post.schemas';

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
    payload: CreatePostDto & { files?: string[] }, // base64 string[]
  ): Promise<any> {
    try {
      // 1. Lấy user
      const user = await lastValueFrom(
        this.userClient.send({ cmd: 'getUserById' }, { id: payload.user_id }),
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
          user_id: user.id,
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
        likeCount: 0,
        viewCount: 0,
        reportCount: 0,
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
   * UPDATE
   */
  async update(
    payload: { post_id: string; updateData: UpdatePostDto; files?: string[] },
  ): Promise<any> {
    try {
      const { post_id, updateData, files } = payload;

      // Upload ảnh mới
      let newImages: string[] = [];
      if (files && files.length > 0) {
        const uploadPromises = files.map(async (base64) => {
          const buffer = Buffer.from(base64, 'base64');
          const res = await lastValueFrom(
            this.authClient.send(
              { cmd: 'upload_image' },
              { fileBuffer: buffer },
            ),
          );
          if (!res?.secure_url) throw new RpcException('Upload failed');
          return res.secure_url;
        });
        newImages = await Promise.all(uploadPromises);
      }

      const post = await this.postRepository.findById(post_id);
      if (!post) throw new NotFoundException(`Post with ID ${post_id} not found`);

      const updatedPost = await this.postRepository.update(post_id, {
        ...updateData,
        images: [...(post.images || []), ...newImages],
      });

      return {
        message: 'Cập nhật bài viết thành công!',
        statusCode: 200,
        post: mapToResponseDto(updatedPost), // DÙNG HÀM CỦA BẠN
      };
    } catch (error) {
      console.error('Error updating post:', error);
      throw new BadRequestException('Failed to update post: ' + error.message);
    }
  }

  /**
   * DELETE
   */
  async delete(post_id: string): Promise<{ message: string }> {
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
}