import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, ROLES_KEY } from 'src/decorators/roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException(
        'Không tìm thấy thông tin người dùng (token có thể hết hạn)',
      );
    }

    if (!user.role) {
      throw new ForbiddenException(
        'Tài khoản này chưa được gán quyền truy cập',
      );
    }

    const hasPermission = requiredRoles.some((role) =>
      Array.isArray(user.role)
        ? user.role.map((r) => r.toLowerCase()).includes(role.toLowerCase())
        : user.role.toLowerCase() === role.toLowerCase(),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện hành động này',
      );
    }

    return true;
  }
}
