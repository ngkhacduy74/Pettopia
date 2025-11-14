export enum Role {
  USER = 'User',
  ADMIN = 'Admin',
  STAFF = 'Staff',
  VET = 'Vet',
  CLINIC = 'Clinic',
}
import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
