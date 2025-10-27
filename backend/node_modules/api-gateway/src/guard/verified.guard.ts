import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class VerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Không tìm thấy thông tin người dùng.');
    }

    if (!user.phone?.verified) {
      throw new ForbiddenException(
        'Bạn cần xác thực số điện thoại để thực hiện thao tác này.',
      );
    }

    if (!user.email?.verified) {
      throw new ForbiddenException(
        'Bạn cần xác thực email để thực hiện thao tác này.',
      );
    }

    return true;
  }
}
