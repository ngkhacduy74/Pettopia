import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class SanitizationPipe implements PipeTransform {
    async transform(value: any, metadata: ArgumentMetadata) {
        if (!metadata.metatype || !this.toValidate(metadata.metatype)) {
            return value;
        }
        const sanitized = this.sanitizeValue(value);

        const object = plainToClass(metadata.metatype, sanitized);
        const errors = await validate(object);

        if (errors.length > 0) {
            throw new BadRequestException('Validation failed');
        }

        return object;
    }

    private toValidate(metatype: Function): boolean {
        const types: Function[] = [String, Boolean, Number, Array, Object];
        return !types.includes(metatype);
    }

    private sanitizeValue(value: any): any {
        if (typeof value === 'string') {
            // Skip sanitization for URLs and data URIs (images, videos, etc.)
            if (this.isUrlOrDataUri(value)) {
                return value;
            }

            return value
                .replace(/['";]/g, '')
                .replace(/--/g, '')
                .replace(/\/\*/g, '')
                .replace(/\*\//g, '')
                .replace(/<script>/gi, '')
                .replace(/<\/script>/gi, '')
                .trim();
        }

        if (typeof value === 'object' && value !== null) {

            const dangerousKeys = [
                '$ne', '$gt', '$gte', '$lt', '$lte',
                '$in', '$nin',
                '$or', '$and', '$not', '$nor',
                '$exists', '$type',
                '$regex', '$where', '$expr',
                '$jsonSchema',
                '$all', '$elemMatch', '$size',
                '$mod', '$text', '$geoWithin',
            ];

            const sanitized: any = Array.isArray(value) ? [] : {};

            for (const key in value) {

                if (dangerousKeys.includes(key)) {
<<<<<<< HEAD
=======
                    console.warn(`⚠️  [Security] Blocked dangerous MongoDB operator: ${key}`);
>>>>>>> main
                    continue;
                }


                sanitized[key] = this.sanitizeValue(value[key]);
            }

            return sanitized;
        }

        return value;
    }

    private isUrlOrDataUri(str: string): boolean {
        // Check if string is a URL or data URI
        return (
            str.startsWith('http://') ||
            str.startsWith('https://') ||
            str.startsWith('data:image/') ||
            str.startsWith('data:video/') ||
            str.startsWith('data:audio/')
        );
    }
}
