import { Prisma, UserRole } from "@prisma/client";
import {
  DEFAULT_BILLING_LABEL,
  DEFAULT_SHIPPING_LABEL,
  upsertAddressByLabel
} from "../dao/address.dao.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser
} from "../dao/user.dao.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { AppError } from "../utils/app-error.js";

type AddressPayload = {
  street: string;
  province: string;
  country: string;
  zip: string;
  phone?: string;
};

type CreditCardPayload = {
  cardHolder: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
};

type RegisterInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  shippingAddress: AddressPayload;
  billingAddress: AddressPayload;
  creditCard: CreditCardPayload;
};

type ProfilePatch = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  shippingAddress?: AddressPayload;
  billingAddress?: AddressPayload;
  creditCard?: CreditCardPayload;
};

function normalizeCardNumber(cardNumber: string) {
  return cardNumber.replace(/\D/g, "");
}

function toCardDefaults(creditCard: CreditCardPayload) {
  const cardNumber = normalizeCardNumber(creditCard.cardNumber);
  if (cardNumber.length < 12) {
    throw new AppError(400, "Card number appears invalid");
  }

  return {
    defaultCardHolder: creditCard.cardHolder.trim(),
    defaultCardLast4: cardNumber.slice(-4),
    defaultCardExpiryMonth: creditCard.expiryMonth.trim(),
    defaultCardExpiryYear: creditCard.expiryYear.trim()
  };
}

function sanitizeAddress(address: AddressPayload) {
  return {
    street: address.street.trim(),
    province: address.province.trim(),
    country: address.country.trim(),
    zip: address.zip.trim(),
    phone: address.phone?.trim() || undefined
  };
}

function mapDefaultAddress(
  addresses: Array<{
    label: string | null;
    street: string;
    province: string;
    country: string;
    zip: string;
    phone: string | null;
  }>,
  label: string
) {
  const match = addresses.find((entry) => entry.label === label);
  if (!match) {
    return null;
  }

  return {
    street: match.street,
    province: match.province,
    country: match.country,
    zip: match.zip,
    phone: match.phone
  };
}

function buildUserView(user: NonNullable<Awaited<ReturnType<typeof findUserById>>>) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    phone: user.phone,
    addresses: user.addresses,
    defaultShippingAddress: mapDefaultAddress(user.addresses, DEFAULT_SHIPPING_LABEL),
    defaultBillingAddress: mapDefaultAddress(user.addresses, DEFAULT_BILLING_LABEL),
    paymentProfile: user.defaultCardLast4
      ? {
          cardHolder: user.defaultCardHolder,
          cardLast4: user.defaultCardLast4,
          expiryMonth: user.defaultCardExpiryMonth,
          expiryYear: user.defaultCardExpiryYear
        }
      : null
  };
}

export async function registerUser(input: RegisterInput) {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new AppError(409, "An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const cardDefaults = toCardDefaults(input.creditCard);

  const user = await createUser({
    email: input.email,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    phone: input.phone?.trim() || undefined,
    passwordHash,
    role: UserRole.CUSTOMER
  });

  await Promise.all([
    upsertAddressByLabel({
      userId: user.id,
      label: DEFAULT_SHIPPING_LABEL,
      ...sanitizeAddress(input.shippingAddress)
    }),
    upsertAddressByLabel({
      userId: user.id,
      label: DEFAULT_BILLING_LABEL,
      ...sanitizeAddress(input.billingAddress)
    })
  ]);

  await updateUser(user.id, cardDefaults);

  const hydrated = await findUserById(user.id);
  if (!hydrated) {
    throw new AppError(500, "Failed to load registered user profile");
  }

  return buildUserView(hydrated);
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

  return buildUserView(user);
}

export async function updateCurrentUserProfile(userId: string, patch: ProfilePatch) {
  const userPatch: Prisma.UserUpdateInput = {};

  if (patch.firstName !== undefined) {
    userPatch.firstName = patch.firstName.trim();
  }
  if (patch.lastName !== undefined) {
    userPatch.lastName = patch.lastName.trim();
  }
  if (patch.phone !== undefined) {
    userPatch.phone = patch.phone?.trim() || null;
  }
  if (patch.creditCard) {
    Object.assign(userPatch, toCardDefaults(patch.creditCard));
  }

  if (Object.keys(userPatch).length > 0) {
    await updateUser(userId, userPatch);
  }

  await Promise.all([
    patch.shippingAddress
      ? upsertAddressByLabel({
          userId,
          label: DEFAULT_SHIPPING_LABEL,
          ...sanitizeAddress(patch.shippingAddress)
        })
      : Promise.resolve(),
    patch.billingAddress
      ? upsertAddressByLabel({
          userId,
          label: DEFAULT_BILLING_LABEL,
          ...sanitizeAddress(patch.billingAddress)
        })
      : Promise.resolve()
  ]);

  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  return buildUserView(user);
}
