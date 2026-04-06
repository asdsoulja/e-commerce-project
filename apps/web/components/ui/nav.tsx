"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

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
  const router = useRouter();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post("/identity/logout");
    },
    onSettled: () => {
      router.push("/login");
      router.refresh();
    }
  });

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
        <button
          onClick={() => logoutMutation.mutate()}
          className="rounded-full border border-border bg-white px-3 py-1 text-sm hover:border-accent hover:text-accent"
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? "Signing out..." : "Sign out"}
        </button>
      </nav>
    </div>
  );
}
