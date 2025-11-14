import {
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  IsNotEmpty,
  Min,
  IsOptional,
  IsDate,
} from 'class-validator';
import { Gender } from '../../schemas/pet.schema';

export class CreatePetDto {
  @IsString()
  @IsNotEmpty({ message: 'User ID is required' })
  user_id: string;

  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Species is required' })
  species: string;

  @IsEnum(Gender, { message: 'Gender must be either Male or Female' })
  gender: Gender;

  @IsString()
  @IsNotEmpty({ message: 'Color is required' })
  color: string;

  @IsNumber({}, { message: 'Weight must be a number' })
  @Min(0, { message: 'Weight must be positive' })
  weight: number;

  @IsDate({ message: 'Date of birth must be a valid date' })
  dateOfBirth: Date;

  @IsString()
  @IsNotEmpty({ message: 'Breed is required' })
  breed: string;
  @IsString()
  avatar_url: string ;

  @IsOptional()
  medical_records?: string[];
}
