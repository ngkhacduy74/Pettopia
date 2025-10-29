import { Body, Controller, Post } from '@nestjs/common';
import { SgStableDiffusionService } from './sg-stable-diffusion.service';

@Controller('ai-img/sg-stable-diffusion')
export class SgStableDiffusionController {
  constructor(private readonly service: SgStableDiffusionService) {}

  @Post('generate')
  async generate(@Body() payload: { prompt: string }) {
    return this.service.generateImage(payload.prompt);
  }
}


