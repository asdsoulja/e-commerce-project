"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api, toErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

type RegisterInput = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema)
  });

  const mutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await api.post("/identity/register", input);
      return data;
    },
    onSuccess: () => {
      router.push("/catalog");
      router.refresh();
    }
  });

  return (
    <form className="grid gap-3" onSubmit={handleSubmit((input) => mutation.mutate(input))}>
      <label className="text-sm font-medium">
        First name
        <Input type="text" autoComplete="given-name" {...register("firstName")} />
        <FieldError message={errors.firstName?.message} />
      </label>

      <label className="text-sm font-medium">
        Last name
        <Input type="text" autoComplete="family-name" {...register("lastName")} />
        <FieldError message={errors.lastName?.message} />
      </label>

      <label className="text-sm font-medium">
        Email
        <Input type="email" autoComplete="email" {...register("email")} />
        <FieldError message={errors.email?.message} />
      </label>

      <label className="text-sm font-medium">
        Password
        <Input type="password" autoComplete="new-password" {...register("password")} />
        <FieldError message={errors.password?.message} />
      </label>

      {mutation.error ? <p className="text-sm text-red-600">{toErrorMessage(mutation.error)}</p> : null}

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Creating account..." : "Register"}
      </Button>
    </form>
  );
}
