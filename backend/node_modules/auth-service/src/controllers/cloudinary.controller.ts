import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CloudinaryService } from '../services/cloudinary.service';

@Controller()
export class CloudinaryController {
  private readonly logger = new Logger(CloudinaryController.name);

  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @MessagePattern({ cmd: 'upload_image' })
  async uploadImage(@Payload() data: { fileBuffer: string }) {
    this.logger.log('Received upload request from another service');
    const buffer = Buffer.from(data.fileBuffer, 'base64'); // Chuyển base64 thành buffer
    return this.cloudinaryService.uploadImage(buffer);
  }

  @MessagePattern({ cmd: 'delete_image' })
  async deleteImage(@Payload() data: { publicId: string }) {
    this.logger.log(`Received delete request for ${data.publicId}`);
    return this.cloudinaryService.deleteImage(data.publicId);
  }
}