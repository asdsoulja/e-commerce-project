"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { api, toErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";

const addressSchema = z.object({
  street: z.string().min(2, "Street is required"),
  province: z.string().min(2, "Province is required"),
  country: z.string().min(2, "Country is required"),
  zip: z.string().min(3, "Postal/zip code is required"),
  phone: z.string().min(6, "Phone must be at least 6 characters")
});

const cardSchema = z.object({
  cardHolder: z.string().min(2, "Card holder is required"),
  cardNumber: z
    .string()
    .min(12, "Card number is required")
    .regex(/^[0-9\-\s]+$/, "Use digits, spaces, or dashes only"),
  expiryMonth: z
    .string()
    .regex(/^(0[1-9]|1[0-2])$/, "Use MM format"),
  expiryYear: z.string().regex(/^\d{4}$/, "Use YYYY format"),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3 or 4 digits")
});

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(6, "Phone must be at least 6 characters"),
  shippingAddress: addressSchema,
  billingAddress: addressSchema,
  creditCard: cardSchema
});

type RegisterInput = z.infer<typeof registerSchema>;

function addressesMatch(
  left?: RegisterInput["shippingAddress"],
  right?: RegisterInput["billingAddress"]
) {
  if (!left || !right) {
    return false;
  }

  return (
    left.street === right.street &&
    left.province === right.province &&
    left.country === right.country &&
    left.zip === right.zip &&
    left.phone === right.phone
  );
}

function AddressFields({
  title,
  prefix,
  register,
  errors
}: {
  title: string;
  prefix: "shippingAddress" | "billingAddress";
  register: ReturnType<typeof useForm<RegisterInput>>["register"];
  errors: ReturnType<typeof useForm<RegisterInput>>["formState"]["errors"];
}) {
  const addressErrors = errors[prefix];

  return (
    <fieldset className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-800">{title}</legend>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span>Street</span>
        <Input
          className="h-11 rounded-xl border-slate-300 bg-white"
          {...register(`${prefix}.street`)}
        />
        <FieldError message={addressErrors?.street?.message} />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Province</span>
          <Input
            className="h-11 rounded-xl border-slate-300 bg-white"
            {...register(`${prefix}.province`)}
          />
          <FieldError message={addressErrors?.province?.message} />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Country</span>
          <Input
            className="h-11 rounded-xl border-slate-300 bg-white"
            {...register(`${prefix}.country`)}
          />
          <FieldError message={addressErrors?.country?.message} />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Postal/Zip</span>
          <Input
            className="h-11 rounded-xl border-slate-300 bg-white"
            {...register(`${prefix}.zip`)}
          />
          <FieldError message={addressErrors?.zip?.message} />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Phone</span>
          <Input
            className="h-11 rounded-xl border-slate-300 bg-white"
            {...register(`${prefix}.phone`)}
          />
          <FieldError message={addressErrors?.phone?.message} />
        </label>
      </div>
    </fieldset>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      shippingAddress: {
        street: "",
        province: "",
        country: "Canada",
        zip: "",
        phone: ""
      },
      billingAddress: {
        street: "",
        province: "",
        country: "Canada",
        zip: "",
        phone: ""
      },
      creditCard: {
        cardHolder: "",
        cardNumber: "",
        expiryMonth: "",
        expiryYear: "",
        cvv: ""
      }
    }
  });

  const shippingAddress = useWatch({
    control,
    name: "shippingAddress"
  });
  const billingAddress = useWatch({
    control,
    name: "billingAddress"
  });

  useEffect(() => {
    if (!billingSameAsShipping) {
      return;
    }

    if (addressesMatch(shippingAddress, billingAddress)) {
      return;
    }

    setValue(
      "billingAddress",
      {
        street: shippingAddress?.street ?? "",
        province: shippingAddress?.province ?? "",
        country: shippingAddress?.country ?? "Canada",
        zip: shippingAddress?.zip ?? "",
        phone: shippingAddress?.phone ?? ""
      },
      { shouldDirty: true }
    );
  }, [billingSameAsShipping, billingAddress, setValue, shippingAddress]);

  const mutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      const payload = billingSameAsShipping
        ? {
            ...input,
            billingAddress: {
              ...input.shippingAddress
            }
          }
        : input;

      const { data } = await api.post("/identity/register", payload);
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["toolbar-session"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["me-role"] }),
        queryClient.invalidateQueries({ queryKey: ["cart"] }),
        queryClient.invalidateQueries({ queryKey: ["cart", "checkout-summary"] })
      ]);
      router.push("/checkout");
      router.refresh();
    }
  });

  return (
    <form className="grid gap-5" onSubmit={handleSubmit((input) => mutation.mutate(input))}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>First name</span>
          <Input
            type="text"
            autoComplete="given-name"
            className="h-11 rounded-2xl border-slate-300 bg-white/95 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_rgba(15,23,42,0.06)] focus:border-slate-500 focus:ring-slate-300/40"
            {...register("firstName")}
          />
          <FieldError message={errors.firstName?.message} />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Last name</span>
          <Input
            type="text"
            autoComplete="family-name"
            className="h-11 rounded-2xl border-slate-300 bg-white/95 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_rgba(15,23,42,0.06)] focus:border-slate-500 focus:ring-slate-300/40"
            {...register("lastName")}
          />
          <FieldError message={errors.lastName?.message} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Email</span>
          <Input
            type="email"
            autoComplete="email"
            className="h-11 rounded-2xl border-slate-300 bg-white/95 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_rgba(15,23,42,0.06)] focus:border-slate-500 focus:ring-slate-300/40"
            {...register("email")}
          />
          <FieldError message={errors.email?.message} />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Phone</span>
          <Input
            type="text"
            autoComplete="tel"
            className="h-11 rounded-2xl border-slate-300 bg-white/95 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_rgba(15,23,42,0.06)] focus:border-slate-500 focus:ring-slate-300/40"
            {...register("phone")}
          />
          <FieldError message={errors.phone?.message} />
        </label>
      </div>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span>Password</span>
        <Input
          type="password"
          autoComplete="new-password"
          className="h-11 rounded-2xl border-slate-300 bg-white/95 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_rgba(15,23,42,0.06)] focus:border-slate-500 focus:ring-slate-300/40"
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />
      </label>

      <div className="grid gap-3">
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={billingSameAsShipping}
            onChange={(event) => setBillingSameAsShipping(event.target.checked)}
          />
          Billing address is same as shipping
        </label>
      </div>

      <div
        className={
          billingSameAsShipping ? "grid gap-4 lg:grid-cols-1" : "grid gap-4 lg:grid-cols-2"
        }
      >
        <AddressFields
          title="Default Shipping Address"
          prefix="shippingAddress"
          register={register}
          errors={errors}
        />

        {billingSameAsShipping ? (
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Billing address will automatically match your shipping address.
          </section>
        ) : (
          <AddressFields
            title="Default Billing Address"
            prefix="billingAddress"
            register={register}
            errors={errors}
          />
        )}
      </div>

      <fieldset className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-800">
          Default Payment Profile
        </legend>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Name on card</span>
          <Input
            className="h-11 rounded-xl border-slate-300 bg-white"
            {...register("creditCard.cardHolder")}
          />
          <FieldError message={errors.creditCard?.cardHolder?.message} />
        </label>

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Card number</span>
          <Input
            className="h-11 rounded-xl border-slate-300 bg-white"
            {...register("creditCard.cardNumber")}
          />
          <FieldError message={errors.creditCard?.cardNumber?.message} />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Expiry month</span>
            <Input
              placeholder="MM"
              className="h-11 rounded-xl border-slate-300 bg-white"
              {...register("creditCard.expiryMonth")}
            />
            <FieldError message={errors.creditCard?.expiryMonth?.message} />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Expiry year</span>
            <Input
              placeholder="YYYY"
              className="h-11 rounded-xl border-slate-300 bg-white"
              {...register("creditCard.expiryYear")}
            />
            <FieldError message={errors.creditCard?.expiryYear?.message} />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>CVV</span>
            <Input
              className="h-11 rounded-xl border-slate-300 bg-white"
              {...register("creditCard.cvv")}
            />
            <FieldError message={errors.creditCard?.cvv?.message} />
          </label>
        </div>

        <p className="text-xs text-slate-500">
          This project stores only safe default card profile details for demo purposes.
        </p>
      </fieldset>

      {mutation.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {toErrorMessage(mutation.error)}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={mutation.isPending}
        className="h-11 rounded-full !border-slate-900 !bg-slate-900 text-white hover:!bg-slate-800"
      >
        {mutation.isPending ? "Creating account..." : "Create account"}
      </Button>

      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-slate-800 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
