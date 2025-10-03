import { IsString, IsEnum, IsNumber, IsDateString, IsNotEmpty, Min } from 'class-validator';
import { Gender } from '../../schemas/pet.schema';

export class CreatePetDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Species is required' })
  species: string;

  @IsEnum(Gender, { message: 'Gender must be either Male or Female' })
  gender: Gender;

  @IsNumber({}, { message: 'Age must be a number' })
  @Min(0, { message: 'Age must be positive' })
  age: number;

  @IsString()
  @IsNotEmpty({ message: 'Color is required' })
  color: string;

  @IsNumber({}, { message: 'Weight must be a number' })
  @Min(0, { message: 'Weight must be positive' })
  weight: number;

  @IsDateString({}, { message: 'Date of birth must be a valid date' })
  dateOfBirth: Date;
}
