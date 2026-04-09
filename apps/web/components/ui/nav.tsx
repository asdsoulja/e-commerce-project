"use client";

import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Catalog" },
  { href: "/cart", label: "Cart" },
  { href: "/checkout", label: "Checkout" },
  { href: "/profile", label: "Profile" },
  { href: "/admin", label: "Admin" },
  { href: "/login", label: "Login" },
  { href: "/register", label: "Register" }
];

export function Nav() {
  return (
    <div className="grid gap-2">
      <nav className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full border border-border bg-white px-3 py-1 text-sm hover:border-accent hover:text-accent"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
