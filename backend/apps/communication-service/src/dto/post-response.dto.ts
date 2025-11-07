export class ReportDto {
  user_id: string;
  reason: string;
  reportedAt: Date;
}
export class PostResponseDto {
  post_id: string;
  author: {
    user_id: string;
    fullname: string;
    avatar?: string;
  };
  title: string;
  content: string;
  tags: string[];
  images: string[];
  isHidden: boolean;
  comments: Array<{
    comment_id: string;
    author: {
      user_id: string;
      fullname: string;
      avatar?: string;
    };
    content: string;
    likes: Array<{
      user_id: string;
      likedAt: Date;
    }>;
    isHidden: boolean;
    isDeleted: boolean;
    createdAt: Date;
  }>;
  commentCount: number;
  likeCount: number;
  viewCount: number;
  reportCount: number;
  reports: ReportDto[];
  createdAt: Date;
  updatedAt: Date;
}