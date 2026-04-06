import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

type CreateUserInput = {
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role?: UserRole;
};

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email }
  });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      addresses: true
    }
  });
}

export async function createUser(input: CreateUserInput) {
  return prisma.user.create({
    data: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: input.passwordHash,
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
    include: {
      addresses: {
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      },
      orders: true
    }
  });
}

export async function updateUser(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({
    where: { id },
    data,
    include: {
      addresses: {
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      }
    }
  });
}
