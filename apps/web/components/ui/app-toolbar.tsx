"use client";

import clsx from "clsx";
import { isAxiosError } from "axios";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

type SessionUser = {
  id: string;
  email: string;
  firstName?: string | null;
  role?: "CUSTOMER" | "ADMIN";
};

type SessionResponse = {
  user?: SessionUser;
};

type ApiCartSummaryResponse = {
  cart?: {
    items?: Array<{
      quantity: number;
    }>;
  };
};

const baseLinks = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Catalog" },
  { href: "/cart", label: "Cart" },
  { href: "/checkout", label: "Checkout" },
];

function linkIsActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppToolbar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ["toolbar-session"],
    queryFn: async () => {
      try {
        const { data } = await api.get<SessionResponse>("/identity/me");
        return data.user ?? null;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) {
          return null;
        }

        throw error;
      }
    },
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post("/identity/logout");
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["toolbar-session"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["me-role"] }),
        queryClient.invalidateQueries({ queryKey: ["cart"] }),
      ]);
      router.push("/login");
      router.refresh();
    },
  });

  const user = sessionQuery.data ?? null;
  const isLoggedIn = Boolean(user);
  const isAdmin = user?.role === "ADMIN";
  const userDisplayName = user?.firstName?.trim() || user?.email || "Account";

  const cartCountQuery = useQuery({
    queryKey: ["cart", "toolbar-count"],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiCartSummaryResponse>("/cart");
        const cartItems = data.cart?.items ?? [];
        return cartItems.reduce((sum, item) => sum + item.quantity, 0);
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) {
          return 0;
        }

        throw error;
      }
    },
    enabled: true,
    retry: false,
  });

  const visibleLinks = [
    ...baseLinks,
    ...(isLoggedIn ? [{ href: "/profile", label: "Profile" }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="mb-6 rounded-3xl border border-slate-700/70 bg-gradient-to-r from-slate-900 to-slate-700 text-white shadow-sm">
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-300">
              Store Navigation
            </p>
            <Link href="/" className="text-2xl font-bold tracking-tight">
              Silly Accessories e-Store
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {visibleLinks.map((link) => {
              const isActive = linkIsActive(pathname, link.href);
              const isCartLink = link.href === "/cart";
              const isProfileLink = link.href === "/profile" && isLoggedIn;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "inline-flex h-12 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition",
                    isProfileLink ? "max-w-[260px]" : null,
                    isActive
                      ? "border-white/70 bg-white/20 text-white"
                      : "border-white/30 bg-white/5 text-slate-100 hover:bg-white/15"
                  )}
                >
                  {isProfileLink ? (
                    <span className="flex min-w-0 flex-col items-start justify-center leading-tight">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200">
                        Signed in as
                      </span>
                      <span className="max-w-[170px] truncate text-sm font-semibold text-white">
                        {userDisplayName}
                      </span>
                    </span>
                  ) : (
                    <span>{link.label}</span>
                  )}
                  {isCartLink ? (
                    <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-white/40 bg-white/20 px-2 py-0.5 text-xs font-bold leading-none text-white">
                      {cartCountQuery.data ?? 0}
                    </span>
                  ) : null}
                </Link>
              );
            })}
            {!isLoggedIn ? (
              <>
                <Link
                  href="/login"
                  className={clsx(
                    "inline-flex h-12 items-center rounded-full border px-4 text-sm font-semibold transition",
                    linkIsActive(pathname, "/login")
                      ? "border-white/70 bg-white/20 text-white"
                      : "border-white/35 bg-white/5 text-slate-100 hover:bg-white/15"
                  )}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className={clsx(
                    "inline-flex h-12 items-center rounded-full border px-4 text-sm font-semibold transition",
                    linkIsActive(pathname, "/register")
                      ? "border-white/70 bg-white/20 text-white"
                      : "border-white/35 bg-white/5 text-slate-100 hover:bg-white/15"
                  )}
                >
                  Register
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="inline-flex h-12 items-center rounded-full border border-white/35 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {logoutMutation.isPending ? "Signing out..." : "Logout"}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
