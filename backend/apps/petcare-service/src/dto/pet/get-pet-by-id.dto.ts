import { IsString, IsNotEmpty } from 'class-validator';

export class GetPetByIdDto {
  @IsString()
  @IsNotEmpty({ message: 'Pet ID is required' })
  pet_id: string;
}
