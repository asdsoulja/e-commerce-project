"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api, toErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

type LoginInput = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema)
  });

  const mutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await api.post("/identity/login", input);
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["toolbar-session"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["me-role"] }),
        queryClient.invalidateQueries({ queryKey: ["cart"] })
      ]);
      router.push("/catalog");
      router.refresh();
    }
  });

  return (
    <form className="grid gap-3" onSubmit={handleSubmit((input) => mutation.mutate(input))}>
      <label className="text-sm font-medium">
        Email
        <Input type="email" autoComplete="email" {...register("email")} />
        <FieldError message={errors.email?.message} />
      </label>

      <label className="text-sm font-medium">
        Password
        <Input type="password" autoComplete="current-password" {...register("password")} />
        <FieldError message={errors.password?.message} />
      </label>

      {mutation.error ? <p className="text-sm text-red-600">{toErrorMessage(mutation.error)}</p> : null}

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
