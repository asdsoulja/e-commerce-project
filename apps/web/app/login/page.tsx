import { LoginForm } from "@/components/forms/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="order-2 relative overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-7 text-white shadow-sm sm:p-8 lg:order-1">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_50%)]" />

        <div className="relative space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
              Welcome Back
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Sign in to continue shopping
            </h1>
            <p className="max-w-lg text-sm leading-7 text-slate-200 sm:text-base">
              Access your cart, checkout flow, purchase history, and profile in
              one place. Use your customer or admin account credentials to keep
              going.
            </p>
          </div>

          <ul className="space-y-3 text-sm text-slate-100">
            <li className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
              Keep your shopping cart synced across pages after sign-in.
            </li>
            <li className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
              Manage profile details and review your order history.
            </li>
            <li className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
              Admin accounts can access dashboard tools and inventory controls.
            </li>
          </ul>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-slate-100">
            <p className="font-semibold text-white">Seed credentials</p>
            <p className="mt-2">Admin: admin@estore.local / Admin123!</p>
            <p>Customer: customer@estore.local / Customer123!</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/catalog"
              className="rounded-full border border-white/35 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Browse Catalog
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-white/35 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>

      <div className="order-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:order-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Account Access
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Sign In
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Use your account details to continue to catalog, cart, and checkout.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
          <LoginForm />
        </div>
      </div>
    </section>
  );
}
