import { RegisterForm } from "@/components/forms/register-form";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="order-2 relative overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-7 text-white shadow-sm sm:p-8 lg:order-1">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_50%)]" />

        <div className="relative space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
              Join Silly Accessories
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Create your customer account
            </h1>
            <p className="max-w-lg text-sm leading-7 text-slate-200 sm:text-base">
              Register once and keep your shopping details ready for checkout.
              Your profile lets you place orders faster and manage your account
              from one place.
            </p>
          </div>

          <ul className="space-y-3 text-sm text-slate-100">
            <li className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
              Track profile details and update your information at any time.
            </li>
            <li className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
              Keep a smoother path through cart and checkout after sign-in.
            </li>
            <li className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
              Start browsing immediately after registration is complete.
            </li>
          </ul>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-slate-100">
            <p className="font-semibold text-white">Account note</p>
            <p className="mt-2">
              This form creates a customer account. Admin access is managed
              separately.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/catalog"
              className="rounded-full border border-white/35 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Browse Catalog
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/35 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>

      <div className="order-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:order-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          New Account
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Create Account
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Register a customer profile to place orders and continue shopping.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
          <RegisterForm />
        </div>
      </div>
    </section>
  );
}
