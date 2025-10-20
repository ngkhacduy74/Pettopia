import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_KEY,
      api_secret: process.env.CLOUDINARY_SECRET,
    });
    console.log('Cloudinary config:', cloudinary.config());
  }

  async uploadImage(file: string | Buffer): Promise<{ secure_url: string }> {
  try {
    this.logger.log(`Uploading file: ${typeof file === 'string' ? file : 'buffer'}`);
    
    // Chuyển Buffer thành base64 hoặc giữ nguyên nếu là string
    const fileToUpload = file instanceof Buffer ? `data:image/jpeg;base64,${file.toString('base64')}` : file;

    // Ép kiểu fileToUpload thành string
    const result = await cloudinary.uploader.upload(fileToUpload as string, {
      folder: 'upload-img-pettopia',
      resource_type: 'image',
    });

    // Xóa file tạm nếu là đường dẫn
    if (typeof file === 'string') {
      try {
        fs.unlinkSync(file);
      } catch (unlinkError) {
        this.logger.warn(`Failed to delete temp file ${file}: ${unlinkError.message}`);
      }
    }

    return { secure_url: result.secure_url };
  } catch (error) {
    this.logger.error('❌ Cloudinary upload failed:', error);
    throw new InternalServerErrorException('Failed to upload image to Cloudinary');
  }
}

  async deleteImage(publicId: string): Promise<{ message: string }> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);

      if (!result || (result.result !== 'ok' && result.result !== 'not found')) {
        throw new Error(`Delete failed: ${JSON.stringify(result)}`);
      }

      return { message: `Deleted ${publicId}` };
    } catch (error) {
      this.logger.error('❌ Cloudinary delete failed:', error);
      throw new InternalServerErrorException('Failed to delete image from Cloudinary');
    }
  }
}