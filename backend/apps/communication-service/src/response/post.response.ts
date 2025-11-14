import { Post } from '../schemas/post.schemas';
import { PostResponseDto } from '../dto/post-response.dto';

export function mapToResponseDto(post: Post): PostResponseDto {
  return {
    post_id: post.post_id,
    author: {
      user_id: post.author.user_id,
      fullname: post.author.fullname,
      avatar: post.author.avatar,
    },
    title: post.title,
    content: post.content,
    tags: post.tags,
    images: post.images,
    isHidden: post.isHidden,
    comments: post.comments || [],
    commentCount: post.commentCount || 0,
    likeCount: post.likeCount,
    viewCount: post.viewCount,
    reportCount: post.reportCount,
    reports: post.reports.map(r => ({
      user_id: r.user_id,
      reason: r.reason,
      reportedAt: r.reportedAt,
    })),
    createdAt: post['createdAt'],
    updatedAt: post['updatedAt'],
  };
}
