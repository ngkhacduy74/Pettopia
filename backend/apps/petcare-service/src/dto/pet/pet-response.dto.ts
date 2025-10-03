import { Gender } from '../../schemas/pet.schema';

export class PetResponseDto {
  pet_id: string;
  name: string;
  species: string;
  gender: Gender;
  age: number;
  color: string;
  weight: number;
  dateOfBirth: Date;
}
