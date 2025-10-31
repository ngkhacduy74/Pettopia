import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ _id: false })
export class LikeHistory {
  @Prop({ type: String, required: true })
  user_id: string;

  @Prop({ type: Date, default: Date.now })
  likedAt: Date;
}

@Schema({ _id: false })
export class ViewHistory {
  @Prop({ type: String, required: true })
  user_id: string;

  @Prop({ type: Date, default: Date.now })
  viewedAt: Date;
}

@Schema({ _id: false })
export class Report {
  @Prop({ type: String, required: true })
  user_id: string;

  @Prop({ type: String, required: true })
  reason: string;

  @Prop({ type: Date, default: Date.now })
  reportedAt: Date;
}

@Schema({ _id: false })
export class Author {
  @Prop({ type: String, required: true })
  user_id: string;

  @Prop({ type: String, required: true })
  fullname: string;

  @Prop({ type: String })
  avatar?: string;
}

/**
 * Comment schema (dành cho phần bình luận bài viết)
 */
@Schema({ _id: false })
export class Comment {
  @Prop({ type: String, default: () => uuidv4() })
  comment_id: string;

  @Prop({ type: Author, required: true })
  author: Author;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: [LikeHistory], default: [] })
  likes: LikeHistory[];

  @Prop({ type: [Report], default: [] })
  reports: Report[];

  @Prop({ type: Boolean, default: false })
  isHidden: boolean; // Ẩn (do vi phạm, bị staff xử lý, hoặc do user yêu cầu)

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean; // Đánh dấu đã xóa

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

/**
 * Transform JSON: remove internal fields _id and __v
 */
function transformValue(doc: any, ret: Record<string, any>) {
  delete ret._id;
  delete ret.__v;
  return ret;
}

@Schema({
  timestamps: true,
  toJSON: { transform: transformValue },
  toObject: { transform: transformValue },
})
export class Post {
  @Prop({ type: String, unique: true, default: () => uuidv4() })
  post_id: string;

  @Prop({ type: Author, required: true })
  author: Author;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  // Dành cho staff ẩn bài viết
  @Prop({ type: Boolean, default: false })
  isHidden: boolean;

  // Người dùng có thể thả tim
  @Prop({ type: [LikeHistory], default: [] })
  likes: LikeHistory[];

  // Lưu danh sách người đã xem bài
  @Prop({ type: [ViewHistory], default: [] })
  views: ViewHistory[];

  // Danh sách report của người dùng
  @Prop({ type: [Report], default: [] })
  reports: Report[];

  // Danh sách bình luận
  @Prop({ type: [Comment], default: [] })
  comments: Comment[];

  // Thống kê
  @Prop({ type: Number, default: 0 })
  likeCount: number;

  @Prop({ type: Number, default: 0 })
  viewCount: number;

  @Prop({ type: Number, default: 0 })
  reportCount: number;

  @Prop({ type: Number, default: 0 })
  commentCount: number;
}

/**
 * Type dành cho repository / module
 */
export type PostDocument = Post & Document;
export const PostSchema = SchemaFactory.createForClass(Post);
