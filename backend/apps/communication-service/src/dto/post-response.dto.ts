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
  likeCount: number;
  viewCount: number;
  reportCount: number;
  createdAt: Date;
  updatedAt: Date;
}