import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

type CreateUserInput = {
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  phone?: string;
  role?: UserRole;
};

const addressOrderBy = {
  createdAt: "desc"
} satisfies Prisma.AddressOrderByWithRelationInput;

const userAuthSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  passwordHash: true
} satisfies Prisma.UserSelect;

const userAccountSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  defaultCardHolder: true,
  defaultCardLast4: true,
  defaultCardExpiryMonth: true,
  defaultCardExpiryYear: true,
  addresses: {
    orderBy: addressOrderBy
  }
} satisfies Prisma.UserSelect;

const userPaymentProfileSelect = {
  defaultCardHolder: true,
  defaultCardLast4: true,
  defaultCardExpiryMonth: true,
  defaultCardExpiryYear: true
} satisfies Prisma.UserSelect;

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: userAuthSelect
  });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: userAccountSelect
  });
}

export async function createUser(input: CreateUserInput) {
  return prisma.user.create({
    data: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: input.passwordHash,
      phone: input.phone,
      role: input.role ?? UserRole.CUSTOMER,
      cart: {
        create: {}
      }
    }
  });
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: userAccountSelect
  });
}

export async function updateUser(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({
    where: { id },
    data,
    select: userAccountSelect
  });
}

export async function findUserPaymentProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: userPaymentProfileSelect
  });
}
