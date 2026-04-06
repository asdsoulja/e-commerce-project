import { UserRole } from "@prisma/client";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser
} from "../dao/user.dao.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { AppError } from "../utils/app-error.js";

export async function registerUser(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new AppError(409, "An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await createUser({
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    passwordHash,
    role: UserRole.CUSTOMER
  });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role
  };
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await findUserByEmail(input.email);
  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const isValid = await comparePassword(input.password, user.passwordHash);
  if (!isValid) {
    throw new AppError(401, "Invalid email or password");
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role
  };
}

export async function getCurrentUser(userId: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    phone: user.phone,
    addresses: user.addresses
  };
}

export async function updateCurrentUserProfile(
  userId: string,
  patch: { firstName?: string; lastName?: string; phone?: string | null }
) {
  const user = await updateUser(userId, {
    firstName: patch.firstName,
    lastName: patch.lastName,
    phone: patch.phone
  });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    phone: user.phone
  };
}
