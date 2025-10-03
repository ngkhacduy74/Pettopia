export enum Role {
    USER = 'user',
    ADMIN = 'admin',
    Staff = 'staff',
    Vet = 'vet',
    Clinic_staff = 'clinic_staff',
  }
  import { SetMetadata } from '@nestjs/common';
  export const ROLES_KEY = 'roles';
  export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
  