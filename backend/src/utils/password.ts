import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  if (!plain || !hashed) return false;
  return bcrypt.compare(plain, hashed);
}

/** Burns ~200ms to make user enumeration via timing harder. */
export async function fakePasswordCompare(plain: string): Promise<boolean> {
  await bcrypt.compare(plain, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
  return false;
}

export function passwordStrengthError(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/\d/.test(password)) return 'Password must contain a number';
  return null;
}
