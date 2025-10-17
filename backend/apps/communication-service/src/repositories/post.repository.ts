import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from '../schemas/post.schemas';

@Injectable()
export class PostRepository {
  constructor(
    @InjectModel(Post.name)
    private readonly postModel: Model<PostDocument>,
  ) {}

  // 🟢 Tạo bài viết
  async create(data: Partial<Post>): Promise<Post> {
    try {
      const post = new this.postModel(data);
      return await post.save();
    } catch (error) {
      throw new InternalServerErrorException('Lỗi khi tạo bài viết: ' + error.message);
    }
  }

  // 🟢 Lấy tất cả bài viết (tuỳ chọn filter)
  async findAll(filter: any = {}): Promise<Post[]> {
    return this.postModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  // 🟢 Lấy bài viết theo ID
  async findById(post_id: string): Promise<Post | null> {
    return this.postModel.findOne({ post_id }).exec();
  }

  // 🟢 Lấy tất cả bài của 1 user
  async findByAuthor(user_id: string): Promise<Post[]> {
    return this.postModel.find({ 'author.user_id': user_id }).sort({ createdAt: -1 }).exec();
  }

  // 🟡 Cập nhật bài viết (chỉ cho chủ bài)
  async update(post_id: string, updateData: Partial<Post>): Promise<Post | null> {
    return this.postModel.findOneAndUpdate({ post_id }, updateData, { new: true }).exec();
  }

  // 🔴 Xóa bài viết
  async delete(post_id: string): Promise<boolean> {
    const result = await this.postModel.deleteOne({ post_id }).exec();
    return result.deletedCount > 0;
  }

  // 🟣 Ẩn bài viết (staff)
  async hide(post_id: string, hidden: boolean): Promise<Post | null> {
    return this.postModel.findOneAndUpdate(
      { post_id },
      { isHidden: hidden },
      { new: true },
    ).exec();
  }

  // ❤️ Thả tim bài viết
  async like(post_id: string, user_id: string): Promise<Post | null> {
    const post = await this.postModel.findOne({ post_id }).exec();
    if (!post) return null;

    const alreadyLiked = post.likes.some(like => like.user_id === user_id);
    if (alreadyLiked) {
      // Nếu đã like → bỏ like
      post.likes = post.likes.filter(like => like.user_id !== user_id);
      post.likeCount = Math.max(post.likeCount - 1, 0);
    } else {
      // Nếu chưa like → thêm like
      post.likes.push({ user_id, likedAt: new Date() });
      post.likeCount += 1;
    }

    await post.save();
    return post;
  }

  // 👁️ Lưu lịch sử xem
  async addView(post_id: string, user_id: string): Promise<Post | null> {
    const post = await this.postModel.findOne({ post_id }).exec();
    if (!post) return null;

    const alreadyViewed = post.views.some(view => view.user_id === user_id);
    if (!alreadyViewed) {
      post.views.push({ user_id, viewedAt: new Date() });
      post.viewCount += 1;
      await post.save();
    }

    return post;
  }

  // 🚨 Báo cáo bài viết
  async report(post_id: string, user_id: string, reason: string): Promise<Post | null> {
    const post = await this.postModel.findOne({ post_id }).exec();
    if (!post) return null;

    const alreadyReported = post.reports.some(r => r.user_id === user_id);
    if (!alreadyReported) {
      post.reports.push({ user_id, reason, reportedAt: new Date() });
      post.reportCount += 1;
      await post.save();
    }

    return post;
  }

  // 📜 Lấy lịch sử user đã thả tim hoặc xem
  async getUserHistory(user_id: string): Promise<{ liked: Post[]; viewed: Post[] }> {
    const liked = await this.postModel.find({ 'likes.user_id': user_id }).exec();
    const viewed = await this.postModel.find({ 'views.user_id': user_id }).exec();
    return { liked, viewed };
  }
}
