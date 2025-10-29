import { Injectable } from '@nestjs/common';

@Injectable()
export class SgStableDiffusionService {
  async generateImage(prompt: string) {
    // Placeholder implementation
    return { ok: true, prompt };
  }
}


