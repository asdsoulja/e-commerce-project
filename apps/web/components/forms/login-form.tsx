"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
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
    <form className="grid gap-4" onSubmit={handleSubmit((input) => mutation.mutate(input))}>
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
        <span>Password</span>
        <Input
          type="password"
          autoComplete="current-password"
          className="h-11 rounded-2xl border-slate-300 bg-white/95 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_rgba(15,23,42,0.06)] focus:border-slate-500 focus:ring-slate-300/40"
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />
      </label>

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
        {mutation.isPending ? "Signing in..." : "Sign in"}
      </Button>

      <p className="text-center text-sm text-slate-600">
        Need an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-slate-800 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900"
        >
          Register here
        </Link>
      </p>
    </form>
  );
}
