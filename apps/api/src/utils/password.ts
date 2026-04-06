import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export async function hashPassword(rawPassword: string) {
  return bcrypt.hash(rawPassword, SALT_ROUNDS);
}

export async function comparePassword(rawPassword: string, hash: string) {
  return bcrypt.compare(rawPassword, hash);
}
