import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from '../schemas/post.schemas';

// --- PHẦN THÊM VÀO ---
// 1. Import Redis client
import redisClient from '../common/redis/redis.module.js';
// (Hãy đảm bảo đường dẫn import này chính xác với cấu trúc thư mục của bạn)
// --- KẾT THÚC PHẦN THÊM VÀO ---

@Injectable()
export class PostRepository {
  // --- PHẦN THÊM VÀO ---
  // 2. Khai báo redis và thời gian cache
  private redis: typeof redisClient;
  private readonly cacheTTL = 3600; // 1 giờ cho cache 1 bài post
  private readonly listCacheTTL = 600; // 10 phút cho cache danh sách
  // --- KẾT THÚC PHẦN THÊM VÀO ---

  constructor(
    @InjectModel(Post.name)
    private readonly postModel: Model<PostDocument>,
  ) {
    // --- PHẦN THÊM VÀO ---
    // 3. Khởi tạo redis
    this.redis = redisClient;
    // --- KẾT THÚC PHẦN THÊM VÀO ---
  }

  // --- PHẦN THÊM VÀO: HÀM HELPER CHO CACHE ---

  /**
   * Lấy key cache cho một bài post đơn lẻ
   */
  private getPostKey(id: string): string {
    return `post:${id}`;
  }

  /**
   * Xóa cache của một bài post đơn lẻ
   */
  private async invalidateSinglePostCache(postId: string) {
    if (postId) {
      await this.redis.del(this.getPostKey(postId));
    }
  }

  /**
   * Xóa tất cả cache danh sách và số đếm liên quan đến post
   */
  private async invalidatePostListCaches(authorId?: string) {
    try {
      const keysToDel = ['posts:all', 'posts:count'];
      if (authorId) {
        keysToDel.push(`posts:author:${authorId}`);
      }
      await this.redis.del(...keysToDel);
    } catch (err) {
      console.error('Lỗi khi xóa cache danh sách post:', err);
    }
  }

  // --- KẾT THÚC PHẦN THÊM VÀO ---

  /**
   * Ghi (Write): Cần XÓA (invalidate) cache
   */
  async create(data: Partial<Post>): Promise<Post> {
    const newPost = new this.postModel(data);
    const savedPost = await newPost.save();

    // --- PHẦN THÊM VÀO ---
    // 4. Xóa cache danh sách
    // Giả định 'data.author' có 'user_id'
    if (data.author && (data.author as any).user_id) {
      await this.invalidatePostListCaches((data.author as any).user_id);
    } else {
      await this.invalidatePostListCaches(); // Xóa cache chung
    }
    // --- KẾT THÚC PHẦN THÊM VÀO ---

    return savedPost;
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async findAll(): Promise<Post[]> {
    const cacheKey = 'posts:all';
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const posts = await this.postModel
        .find()
        .sort({ createdAt: -1 })
        .lean() // Dùng .lean() để tăng tốc độ
        .exec();

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(posts), {
        EX: this.listCacheTTL,
      });

      return posts;
    } catch (error) {
      // Fallback: Nếu Redis lỗi, vẫn lấy từ DB
      return await this.postModel.find().sort({ createdAt: -1 }).exec();
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async findById(post_id: string): Promise<Post | null> {
    const cacheKey = this.getPostKey(post_id);
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const post = await this.postModel.findOne({ post_id }).lean().exec(); // Thêm .lean()

      // 3. Lưu vào Redis (nếu tìm thấy)
      if (post) {
        await this.redis.set(cacheKey, JSON.stringify(post), {
          EX: this.cacheTTL,
        });
      }

      return post;
    } catch (error) {
      // Fallback
      return await this.postModel.findOne({ post_id }).exec();
    }
  }

  /**
   * Sửa (Update): Cần XÓA (invalidate) cache
   */
  async update(post_id: string, updateData: Partial<Post>): Promise<Post> {
    const updatedPost = await this.postModel
      .findOneAndUpdate({ post_id }, updateData, { new: true })
      .exec(); // Không dùng .lean() ở đây vì chúng ta cần 'author.user_id'

    if (!updatedPost)
      throw new NotFoundException(`Post with ID ${post_id} not found`);

    // --- PHẦN THÊM VÀO ---
    // 4. Xóa cache
    await this.invalidateSinglePostCache(post_id);
    if (updatedPost.author && (updatedPost.author as any).user_id) {
      await this.invalidatePostListCaches((updatedPost.author as any).user_id);
    } else {
      await this.invalidatePostListCaches();
    }
    // --- KẾT THÚC PHẦN THÊM VÀO ---

    return updatedPost;
  }

  /**
   * Xóa (Delete): Cần XÓA (invalidate) cache
   */
  async delete(post_id: string): Promise<boolean> {
    // Dùng findOneAndDelete để lấy được doc đã xóa (chứa author_id)
    const deletedPost = await this.postModel
      .findOneAndDelete({ post_id })
      .exec();

    if (!deletedPost) return false;

    // --- PHẦN THÊM VÀO ---
    // 4. Xóa cache
    await this.invalidateSinglePostCache(post_id);
    if (deletedPost.author && (deletedPost.author as any).user_id) {
      await this.invalidatePostListCaches(
        (deletedPost.author as any).user_id,
      );
    } else {
      await this.invalidatePostListCaches();
    }
    // --- KẾT THÚC PHẦN THÊM VÀO ---

    return true; // Trả về true vì đã tìm thấy và xóa
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async count(): Promise<number> {
    const cacheKey = 'posts:count';
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const count = await this.postModel.countDocuments();

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(count), {
        EX: this.listCacheTTL,
      });

      return count;
    } catch (error) {
      // Fallback
      return await this.postModel.countDocuments();
    }
  }

  /**
   * Đọc (Read): Áp dụng Cache-Aside
   */
  async findByAuthorId(user_id: string): Promise<Post[]> {
    const cacheKey = `posts:author:${user_id}`;
    try {
      // 1. Thử tìm trong Redis
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached); // Cache Hit
      }

      // 2. Cache Miss -> Tìm trong MongoDB
      const posts = await this.postModel
        .find({ 'author.user_id': user_id })
        .select(
          'post_id title content comments likeCount author reports reportCount createdAt',
        )
        .lean() // Thêm .lean()
        .exec();

      // 3. Lưu vào Redis
      await this.redis.set(cacheKey, JSON.stringify(posts), {
        EX: this.listCacheTTL,
      });

      return posts;
    } catch (error) {
      // Fallback
      return this.postModel
        .find({ 'author.user_id': user_id })
        .select(
          'post_id title content comments likeCount author reports reportCount createdAt',
        )
        .exec();
    }
  }
}