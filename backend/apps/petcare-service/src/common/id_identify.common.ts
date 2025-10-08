import { customAlphabet } from 'nanoid';

export function generatePetId(): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const nanoid = customAlphabet(alphabet, 7);
  return nanoid();
}
