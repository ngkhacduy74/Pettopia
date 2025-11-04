import { Body, Controller, Post, Res } from '@nestjs/common';
import { createReadStream } from 'fs';
import { GenerateImageDto } from './generate-image.dto';
import { StableDifusionIntegrationService } from './stable-difusion-integration.service';

@Controller('stable-difusion-integration')
export class StableDifusionIntegrationController {
    constructor(private readonly service:StableDifusionIntegrationService){}

    @Post()
    async generateImage(@Body() data:GenerateImageDto, @Res() res: any){
        const filePath = await this.service.generateImage(data)
        res.set({ 'Content-Type': 'image/png' })
        const file = createReadStream(filePath)
        file.pipe(res)
    }
}
