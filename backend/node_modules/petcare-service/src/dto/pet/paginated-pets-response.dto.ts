import { Pet } from '../../schemas/pet.schema';

export interface PaginatedPetsResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type PaginatedPetsResponseType = PaginatedPetsResponse<Pet>;
