import {
  Controller,
  Get,
  Res,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { PrometheusService } from '../services/prometheus.service';

@Controller('metrics')
export class PrometheusController {
  private readonly logger = new Logger(PrometheusController.name);

  constructor(private readonly prometheusService: PrometheusService) {}

  @Get()
  async getMetrics(@Res() res: Response): Promise<void> {
    try {
      const metrics = await this.prometheusService.getMetrics();
      const contentType = this.prometheusService.getContentType();

      res.set('Content-Type', contentType);
      res.send(metrics);

      this.logger.debug('Metrics retrieved successfully');
    } catch (error) {
      this.logger.error(
        `Failed to retrieve metrics: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve metrics',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
