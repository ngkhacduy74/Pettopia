import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { PrometheusService } from '../services/prometheus.service';

@Injectable()
export class PrometheusMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PrometheusMiddleware.name);

  constructor(private readonly prometheusService: PrometheusService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (req.path === '/metrics' || req.path === '/metrics/health') {
      return next();
    }

    const startTime = Date.now();
    const requestSize = req.get('content-length')
      ? parseInt(req.get('content-length')!, 10)
      : undefined;

    const originalEnd = res.end;
    res.end = function (...args: any[]): any {
      const durationMs = Date.now() - startTime;

      try {
        this.prometheusService.recordHttpRequest(
          req.method,
          req.route?.path || req.path,
          res.statusCode,
          durationMs,
        );
      } catch (error) {
        this.logger.warn(`Failed to record metrics: ${error.message}`);
      }

      return originalEnd.apply(res, args);
    }.bind(this);

    next();
  }
}
