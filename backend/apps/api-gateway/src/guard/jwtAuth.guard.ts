import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.token;

    if (!authHeader) {
      throw new ForbiddenException(
        'Bạn đang thiếu token để thực hiện chức năng này',
      );
    }

    try {
      const decoded_token = await this.jwtService.verify(authHeader);
      console.log('Token verify:', decoded_token);
      request.user = decoded_token;
      return true;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException(
          'Token đã hết hạn, vui lòng đăng nhập lại',
        );
      }

      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Token không hợp lệ');
      }

      console.error('Lỗi xác thực token:', error.message);
      throw new UnauthorizedException('Xác thực token thất bại');
    }
  }
}
