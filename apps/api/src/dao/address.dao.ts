import { prisma } from "../lib/prisma.js";

export const DEFAULT_SHIPPING_LABEL = "default_shipping";
export const DEFAULT_BILLING_LABEL = "default_billing";

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

export async function findLatestAddressByLabel(userId: string, label: string) {
  return prisma.address.findFirst({
    where: {
      userId,
      label
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function upsertAddressByLabel(input: AddressInput & { label: string }) {
  const existing = await findLatestAddressByLabel(input.userId, input.label);

  if (!existing) {
    return createAddress(input);
  }

  return prisma.address.update({
    where: {
      id: existing.id
    },
    data: {
      street: input.street,
      province: input.province,
      country: input.country,
      zip: input.zip,
      phone: input.phone
    }
  });
}
