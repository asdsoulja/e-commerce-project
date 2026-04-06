import { prisma } from "../lib/prisma.js";

type AddressInput = {
  userId: string;
  label?: string;
  street: string;
  province: string;
  country: string;
  zip: string;
  phone?: string;
};

export async function createAddress(input: AddressInput) {
  return prisma.address.create({
    data: {
      userId: input.userId,
      label: input.label,
      street: input.street,
      province: input.province,
      country: input.country,
      zip: input.zip,
      phone: input.phone
    }
  });
}
