import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ClinicUpdateGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const token = request.headers['token_clinic'];

    const params = request.params;

    if (!token) {
      throw new UnauthorizedException(
        "Không tìm thấy 'token_clinic' trong header.",
      );
    }

    try {
      // 1. Giải mã token (JWT 15 phút)
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      if (payload.type !== 'clinic-update' || payload.sub !== params.id) {
        throw new UnauthorizedException(
          'Token không hợp lệ cho phòng khám này.',
        );
      }

      request.user = payload;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn.');
    }
  }
}
