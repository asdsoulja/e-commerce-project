import { RegisterForm } from "@/components/forms/register-form";

export default function RegisterPage() {
  return (
    <section className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-1 text-xl font-semibold">Create Account</h2>
      <p className="mb-4 text-sm text-slate-600">Register a customer profile to place orders.</p>
      <RegisterForm />
    </section>
  );
}
