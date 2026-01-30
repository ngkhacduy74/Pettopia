import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const method = req.method;
    const url = req.originalUrl;
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(
        `[${new Date().toISOString()}] ${method} ${url} ${res.statusCode} - ${duration}ms`,
      );
    });
    console.log(
      `[Middleware] ${req.method} ${req.originalUrl} - Start processing`,
    );
    next();
  }
}
