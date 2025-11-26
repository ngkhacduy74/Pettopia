import {
  IsUUID,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  ValidateNested,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MedicationItemDto {
  @IsString({ message: 'medication_name phải là chuỗi' })
  @MinLength(2, { message: 'medication_name phải có ít nhất 2 ký tự' })
  @MaxLength(200, {
    message: 'medication_name không được vượt quá 200 ký tự',
  })
  medication_name: string;

  @IsString({ message: 'dosage phải là chuỗi' })
  @MinLength(1, { message: 'dosage không được để trống' })
  @MaxLength(100, { message: 'dosage không được vượt quá 100 ký tự' })
  dosage: string;

  @IsString({ message: 'instructions phải là chuỗi' })
  @MinLength(5, { message: 'instructions phải có ít nhất 5 ký tự' })
  @MaxLength(500, {
    message: 'instructions không được vượt quá 500 ký tự',
  })
  instructions: string;
}

export class CreateMedicalRecordDto {
  @IsUUID('4', { message: 'appointment_id phải là UUID v4 hợp lệ' })
  appointment_id: string;

  @IsUUID('4', { message: 'pet_id phải là UUID v4 hợp lệ' })
  pet_id: string;

  @IsUUID('4', { message: 'vet_id phải là UUID v4 hợp lệ' })
  vet_id: string;

  @IsUUID('4', { message: 'clinic_id phải là UUID v4 hợp lệ' })
  clinic_id: string;

  @IsString({ message: 'symptoms phải là chuỗi' })
  @MinLength(5, { message: 'symptoms phải có ít nhất 5 ký tự' })
  @MaxLength(2000, { message: 'symptoms không được vượt quá 2000 ký tự' })
  symptoms: string;

  @IsString({ message: 'diagnosis phải là chuỗi' })
  @MinLength(5, { message: 'diagnosis phải có ít nhất 5 ký tự' })
  @MaxLength(2000, { message: 'diagnosis không được vượt quá 2000 ký tự' })
  diagnosis: string;

  @IsOptional()
  @IsString({ message: 'notes phải là chuỗi' })
  @MaxLength(2000, { message: 'notes không được vượt quá 2000 ký tự' })
  notes?: string;

  @IsArray({ message: 'medications phải là mảng' })
  @ArrayNotEmpty({ message: 'medications không được để trống' })
  @ValidateNested({ each: true })
  @Type(() => MedicationItemDto)
  medications: MedicationItemDto[];
}
