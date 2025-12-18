import { Gender } from '../../schemas/pet.schema';

export class PetResponseDto {
  id: string;
  name: string;
  species: string;
  gender: Gender;
  color: string;
  weight: number;
  breed: string;
  dateOfBirth: Date;
  owner: object;
  avatar_url: string;
  medical_records?: any[];
  qr_code_url?: string;
}
