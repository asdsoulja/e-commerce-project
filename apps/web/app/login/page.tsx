import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-1 text-xl font-semibold">Sign In</h2>
      <p className="mb-4 text-sm text-slate-600">Use your customer or admin account to continue.</p>
      <LoginForm />
    </section>
  );
}
