import { Injectable } from '@nestjs/common';

@Injectable()
export class StableDifusionIntegrationService {
  async generate(prompt: string) {
    // Placeholder implementation
    return { ok: true, prompt };
  }
}


