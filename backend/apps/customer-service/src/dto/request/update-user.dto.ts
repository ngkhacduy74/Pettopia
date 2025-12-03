import { IsBoolean, IsDateString, IsEmail, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
    @IsString()
    @IsOptional()
    city?: string;

    @IsString()
    @IsOptional()
    district?: string;

    @IsString()
    @IsOptional()
    ward?: string;

    @IsString()
    @IsOptional()
    description?: string;
}

export class UpdateUserDto {
    @IsString()
    @IsOptional()
    fullname?: string;

    @IsDateString()
    @IsOptional()
    dob?: Date;

    @IsString()
    @IsOptional()
    bio?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => AddressDto)
    address?: AddressDto;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;

    @IsString()
    @IsOptional()
    phone_number?: string;

    @IsEmail()
    @IsOptional()
    email_address?: string;
}
