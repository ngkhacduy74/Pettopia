import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { PrometheusService } from '../services/prometheus.service';

@Injectable()
export class PrometheusMiddleware implements NestMiddleware {
  constructor(private readonly prometheusService: PrometheusService) { }

  use(req: Request, res: Response, next: NextFunction): void {
    // Bỏ qua các route metrics để tránh loop
    if (req.path === '/metrics' || req.path === '/metrics/health') {
      return next();
    }

    const start = Date.now();

    // Dùng res.on('finish') — KHÔNG override res.end (best-practice)
    res.on('finish', () => {
      const durationMs = Date.now() - start;

      try {
        this.prometheusService.recordHttpRequest(
          req.method,
          req.route?.path || req.path,
          res.statusCode,
          durationMs,
        );
      } catch (error) {
        // Không log warn liên tục (sẽ gây spam CPU)
        // Nếu cần log, hãy log nhẹ nhàng 1 lần duy nhất hoặc bằng debug flag
      }
    });

    next();
  }
}
