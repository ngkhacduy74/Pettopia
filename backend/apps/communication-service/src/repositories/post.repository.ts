import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from '../schemas/post.schemas';

@Injectable()
export class PostRepository {
  constructor(
    @InjectModel(Post.name)
    private readonly postModel: Model<PostDocument>,
  ) {}

  async create(data: Partial<Post>): Promise<Post> {
    const newPost = new this.postModel(data);
    return await newPost.save();
  }

  async findAll(): Promise<Post[]> {
    return await this.postModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(post_id: string): Promise<Post | null> {
    return await this.postModel.findOne({ post_id }).exec();
  }

  async update(post_id: string, updateData: Partial<Post>): Promise<Post> {
    const updatedPost = await this.postModel
      .findOneAndUpdate({ post_id }, updateData, { new: true })
      .exec();

    if (!updatedPost) throw new NotFoundException(`Post with ID ${post_id} not found`);
    return updatedPost;
  }

  async delete(post_id: string): Promise<boolean> {
    const result = await this.postModel.deleteOne({ post_id }).exec();
    return result.deletedCount > 0;
  }

  async count(): Promise<number> {
    return await this.postModel.countDocuments();
  }

 async findByAuthorId(user_id: string): Promise<Post[]> {
  return this.postModel
    .find({ "author.user_id": user_id })
    // 1. Sửa .select() để bao gồm 'author'
    .select('post_id title tag content comments like isHidden likeCount author reports reportCount createdAt') // <-- THÊM 'author' VÀO ĐÂY

    .exec();
}
}
