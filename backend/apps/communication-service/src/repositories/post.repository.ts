import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from '../schemas/post.schemas';
import redisClient from '../common/redis/redis.module.js';

@Injectable()
export class PostRepository {
  private redis: typeof redisClient;
  private readonly cacheTTL = 3600;
  private readonly listCacheTTL = 600;

  constructor(
    @InjectModel(Post.name)
    private readonly postModel: Model<PostDocument>,
  ) {
    this.redis = redisClient;
  }

  private async safeGet(key: string): Promise<string | null> {
    try {
      if (!this.redis.isOpen) return null;
      return await this.redis.get(key);
    } catch (error) {
      return null;
    }
  }

  private async safeSet(key: string, value: string, options?: any) {
    try {
      if (!this.redis.isOpen) return;
      await this.redis.set(key, value, options);
    } catch (error) {}
  }

  private async safeDel(keys: string | string[]) {
    try {
      if (!this.redis.isOpen) return;
      await this.redis.del(keys);
    } catch (error) {}
  }

  private getPostKey(id: string): string {
    return `post:${id}`;
  }

  private async invalidateSinglePostCache(postId: string) {
    if (postId) {
      await this.safeDel(this.getPostKey(postId));
    }
  }

  private async invalidatePostListCaches(authorId?: string) {
    const keysToDel = ['posts:all', 'posts:count'];
    if (authorId) {
      keysToDel.push(`posts:author:${authorId}`);
    }
    await this.safeDel(keysToDel);
  }

  async create(data: Partial<Post>): Promise<Post> {
    const newPost = new this.postModel(data);
    const savedPost = await newPost.save();

    if (data.author && (data.author as any).user_id) {
      await this.invalidatePostListCaches((data.author as any).user_id);
    } else {
      await this.invalidatePostListCaches();
    }

    return savedPost;
  }

  async findAll(): Promise<Post[]> {
    const cacheKey = 'posts:all';

    const cached = await this.safeGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const posts = await this.postModel
      .find()
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    await this.safeSet(cacheKey, JSON.stringify(posts), {
      EX: this.listCacheTTL,
    });

    return posts;
  }

  async findById(post_id: string): Promise<Post | null> {
    const cacheKey = this.getPostKey(post_id);

    const cached = await this.safeGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const post = await this.postModel.findOne({ post_id }).lean().exec();

    if (post) {
      await this.safeSet(cacheKey, JSON.stringify(post), {
        EX: this.cacheTTL,
      });
    }

    return post;
  }

  async update(post_id: string, updateData: Partial<Post>): Promise<Post> {
    const updatedPost = await this.postModel
      .findOneAndUpdate({ post_id }, updateData, { new: true })
      .exec();

    if (!updatedPost)
      throw new NotFoundException(`Post with ID ${post_id} not found`);

    await this.invalidateSinglePostCache(post_id);
    if (updatedPost.author && (updatedPost.author as any).user_id) {
      await this.invalidatePostListCaches((updatedPost.author as any).user_id);
    } else {
      await this.invalidatePostListCaches();
    }

    return updatedPost;
  }

  async delete(post_id: string): Promise<boolean> {
    const deletedPost = await this.postModel
      .findOneAndDelete({ post_id })
      .exec();

    if (!deletedPost) return false;

    await this.invalidateSinglePostCache(post_id);
    if (deletedPost.author && (deletedPost.author as any).user_id) {
      await this.invalidatePostListCaches((deletedPost.author as any).user_id);
    } else {
      await this.invalidatePostListCaches();
    }

    return true;
  }

  async count(): Promise<number> {
    const cacheKey = 'posts:count';

    const cached = await this.safeGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const count = await this.postModel.countDocuments();

    await this.safeSet(cacheKey, JSON.stringify(count), {
      EX: this.listCacheTTL,
    });

    return count;
  }

  async findByAuthorId(user_id: string): Promise<Post[]> {
    const cacheKey = `posts:author:${user_id}`;

    const cached = await this.safeGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const posts = await this.postModel
      .find({ 'author.user_id': user_id })
      .select(
        'post_id title content comments likeCount author reports reportCount createdAt',
      )
      .lean()
      .exec();

    await this.safeSet(cacheKey, JSON.stringify(posts), {
      EX: this.listCacheTTL,
    });

    return posts;
  }
}
