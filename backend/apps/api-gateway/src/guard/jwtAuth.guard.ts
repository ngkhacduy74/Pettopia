// api-gateway/src/guards/jwt-auth.guard.ts
import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    ForbiddenException,
  } from '@nestjs/common';
  import { JwtService } from '@nestjs/jwt';
  
  @Injectable()
  export class JwtAuthGuard implements CanActivate {
    constructor(private jwtService: JwtService) {}
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers.token;
      if (!authHeader) {
        throw new ForbiddenException(
          'Bạn đang thiếu token để thực hiện chức năng này',
        );
      }
      const decoded_token = await this.jwtService.verify(authHeader);
      console.log('token verify : ' + JSON.stringify(decoded_token));
      request.user = decoded_token; 
      return true;
    }
  }
  