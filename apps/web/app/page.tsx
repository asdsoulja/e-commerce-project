import Link from "next/link";

const featuredCategories = [
  {
    title: "Keyboards",
    description: "Mechanical, wireless, compact, and gaming keyboards.",
    href: "/catalog?search=keyboard",
  },
  {
    title: "Mice",
    description: "Precision mice for work, school, and gaming setups.",
    href: "/catalog?search=mouse",
  },
  {
    title: "Headsets",
    description: "Comfortable audio gear for calls, music, and gaming.",
    href: "/catalog?search=headset",
  },
  {
    title: "Gamepads",
    description: "Controllers and accessories for smoother gameplay.",
    href: "/catalog?search=gamepad",
  },
];

const quickLinks = [
  { label: "Browse Catalog", href: "/catalog" },
  { label: "View Cart", href: "/cart" },
  { label: "Checkout", href: "/checkout" },
  { label: "My Profile", href: "/profile" },
  { label: "Admin Panel", href: "/admin" },
];

export default function HomePage() {
  return (
    <main className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-700 px-8 py-12 text-white shadow-sm">
        <div className="max-w-3xl space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
            EECS 4413 Team Project
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Computer Accessories e-Store
          </h1>

          <p className="max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
            Shop keyboards, mice, headsets, gamepads, and other computer
            accessories through a clean customer flow with catalog browsing,
            cart management, checkout, profile tools, and admin management.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/catalog"
              className="rounded-full border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Start Shopping
            </Link>

            <Link
              href="/register"
              className="rounded-full border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {featuredCategories.map((category) => (
          <Link
            key={category.title}
            href={category.href}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-slate-900">
                {category.title}
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                {category.description}
              </p>
              <span className="inline-block text-sm font-medium text-slate-900">
                Shop {category.title} →
              </span>
            </div>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            What this store supports
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">Customer features</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Register, sign in, and sign out</li>
                <li>Browse products with search, sort, and filters</li>
                <li>View item details and inventory remaining</li>
                <li>Manage cart and complete checkout</li>
                <li>Maintain profile and purchase history</li>
              </ul>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">Admin features</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Review sales history</li>
                <li>Maintain inventory records</li>
                <li>Maintain customer account data</li>
                <li>Support full e-store demo coverage</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Quick access</h2>
          <div className="mt-5 flex flex-col gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Seed credentials</p>
            <p className="mt-2">Admin: admin@estore.local / Admin123!</p>
            <p>Customer: customer@estore.local / Customer123!</p>
          </div>
        </div>
      </section>
    </main>
  );
}
