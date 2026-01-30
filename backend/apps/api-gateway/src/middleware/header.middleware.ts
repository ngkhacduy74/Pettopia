import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HeaderCheckMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const contentType = req.headers['content-type'];

    if (!contentType || !contentType.includes('application/json')) {
      throw new UnauthorizedException('Invalid Content-Type');
    }

    const publicRoutes = ['/api/v1/auth/login', '/api/v1/auth/register'];

    if (!publicRoutes.includes(req.originalUrl)) {
      if (!authHeader) {
        throw new UnauthorizedException('Missing Authorization header');
      }

      if (!authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Invalid Authorization format');
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException('Token not found');
      }

      req['token'] = token;
    }

    next();
  }
}
