import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
  } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  import { Observable } from 'rxjs';
  import { Role, ROLES_KEY } from 'src/decorators/roles.decorator';
  
  @Injectable()
  export class RoleGuard implements CanActivate {
    constructor(private reflector: Reflector) {}
  
    canActivate(context: ExecutionContext): boolean {
      // Bỏ Promise vì không cần async
      console.log('đã chạy vào hàm role gủad');
      const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
  
      if (!requiredRoles) {
        return true;
      }
  
      const { user } = context.switchToHttp().getRequest();
      console.log('user:' + JSON.stringify(user));
      
      if (!user) {
        throw new ForbiddenException('Không tìm thấy thông tin người dùng!');
      }
  
      if (!requiredRoles.some((role) => user.role === role)) {
        throw new ForbiddenException(
          'Bạn không có quyền thực hiện hành động này!',
        );
      }
  
      return requiredRoles.some((role) => user.role === role);
    }
  }
  