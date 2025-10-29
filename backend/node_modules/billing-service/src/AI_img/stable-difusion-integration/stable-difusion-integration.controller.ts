import { Body, Controller, Post } from '@nestjs/common';
import { StableDifusionIntegrationService } from './stable-difusion-integration.service';

@Controller('ai-img/stable-diffusion')
export class StableDifusionIntegrationController {
  constructor(private readonly service: StableDifusionIntegrationService) {}

  @Post('generate')
  async generate(@Body() payload: { prompt: string }) {
    return this.service.generate(payload.prompt);
  }
}


