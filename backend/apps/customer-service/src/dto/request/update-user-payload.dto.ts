import { IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateUserDto } from './update-user.dto';

export class UpdateUserPayloadDto {
    @IsString()
    id: string;

    @ValidateNested()
    @Type(() => UpdateUserDto)
    updateData: UpdateUserDto;
}
