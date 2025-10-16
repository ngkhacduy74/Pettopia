import { Pet } from 'src/schemas/pet.schema';
import { PetResponseDto } from '../pet/pet-response.dto';

export function mapToResponseDto(pet: Pet): PetResponseDto {
  return {
    id: pet.id,
    name: pet.name,
    species: pet.species,
    gender: pet.gender,
    breed: pet.breed,
    color: pet.color,
    weight: pet.weight,
    dateOfBirth: pet.dateOfBirth,
    owner: pet.owner,
    avatar_url: pet.avatar_url,
  };
}
