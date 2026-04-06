"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api, toErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";

const addressSchema = z.object({
  street: z.string().min(2),
  province: z.string().min(2),
  country: z.string().min(2),
  zip: z.string().min(3),
  phone: z.string().min(6)
});

const creditCardSchema = z.object({
  cardHolder: z.string().min(2),
  cardNumber: z.string().min(12),
  expiry: z.string().min(4),
  cvv: z.string().min(3)
});

const checkoutSchema = z.object({
  creditCard: creditCardSchema,
  billingAddress: addressSchema,
  shippingAddress: addressSchema
});

type CheckoutInput = z.infer<typeof checkoutSchema>;

type AddressPrefix = "billingAddress" | "shippingAddress";

function AddressFields({
  prefix,
  title,
  register,
  errors
}: {
  prefix: AddressPrefix;
  title: string;
  register: ReturnType<typeof useForm<CheckoutInput>>["register"];
  errors: ReturnType<typeof useForm<CheckoutInput>>["formState"]["errors"];
}) {
  const prefixErrors = errors[prefix];

  return (
    <fieldset className="grid gap-2 rounded-lg border border-border p-3">
      <legend className="px-1 text-sm font-semibold">{title}</legend>

      <label className="text-sm">
        Street
        <Input {...register(`${prefix}.street`)} />
        <FieldError message={prefixErrors?.street?.message} />
      </label>

      <label className="text-sm">
        Province
        <Input {...register(`${prefix}.province`)} />
        <FieldError message={prefixErrors?.province?.message} />
      </label>

      <label className="text-sm">
        Country
        <Input {...register(`${prefix}.country`)} />
        <FieldError message={prefixErrors?.country?.message} />
      </label>

      <label className="text-sm">
        Postal/Zip code
        <Input {...register(`${prefix}.zip`)} />
        <FieldError message={prefixErrors?.zip?.message} />
      </label>

      <label className="text-sm">
        Phone
        <Input {...register(`${prefix}.phone`)} />
        <FieldError message={prefixErrors?.phone?.message} />
      </label>
    </fieldset>
  );
}

export function CheckoutForm() {
  const queryClient = useQueryClient();

  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      creditCard: {
        cardHolder: "",
        cardNumber: "",
        expiry: "",
        cvv: ""
      },
      billingAddress: {
        street: "",
        province: "ON",
        country: "Canada",
        zip: "",
        phone: ""
      },
      shippingAddress: {
        street: "",
        province: "ON",
        country: "Canada",
        zip: "",
        phone: ""
      }
    }
  });

  const mutation = useMutation({
    mutationFn: async (input: CheckoutInput) => {
      const { data } = await api.post("/orders/checkout", input);
      return data as { approved: boolean; message: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  });

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((input) => mutation.mutate(input))}>
      <fieldset className="grid gap-2 rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-semibold">Credit Card</legend>

        <label className="text-sm">
          Card holder
          <Input {...form.register("creditCard.cardHolder")} />
          <FieldError message={form.formState.errors.creditCard?.cardHolder?.message} />
        </label>

        <label className="text-sm">
          Card number
          <Input {...form.register("creditCard.cardNumber")} />
          <FieldError message={form.formState.errors.creditCard?.cardNumber?.message} />
        </label>

        <div className="grid gap-2 md:grid-cols-2">
          <label className="text-sm">
            Expiry (MM/YY)
            <Input {...form.register("creditCard.expiry")} />
            <FieldError message={form.formState.errors.creditCard?.expiry?.message} />
          </label>
          <label className="text-sm">
            CVV
            <Input {...form.register("creditCard.cvv")} />
            <FieldError message={form.formState.errors.creditCard?.cvv?.message} />
          </label>
        </div>
      </fieldset>

      <div className="grid gap-3 md:grid-cols-2">
        <AddressFields
          prefix="billingAddress"
          title="Billing Address"
          register={form.register}
          errors={form.formState.errors}
        />
        <AddressFields
          prefix="shippingAddress"
          title="Shipping Address"
          register={form.register}
          errors={form.formState.errors}
        />
      </div>

      {mutation.error ? <p className="text-sm text-red-600">{toErrorMessage(mutation.error)}</p> : null}

      {mutation.data ? (
        <p className={mutation.data.approved ? "text-sm text-emerald-700" : "text-sm text-red-700"}>
          {mutation.data.message}
        </p>
      ) : null}

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Processing..." : "Confirm order"}
      </Button>
    </form>
  );
}
