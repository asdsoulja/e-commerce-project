"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, toErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";

type CartItem = {
  itemId: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  inventoryRemaining?: number;
};

type ApiCartItem = {
  itemId: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
  inventory: number;
  imageUrl?: string | null;
};

type ApiCartResponse = {
  cart: {
    items: ApiCartItem[];
    total: number;
  };
};

type CartResponse = {
  items: CartItem[];
  subtotal: number;
  total: number;
};

function normalizeCartResponse(data: ApiCartResponse): CartResponse {
  const cart = data.cart ?? { items: [], total: 0 };

  return {
    items: cart.items.map((item) => ({
      itemId: item.itemId,
      name: item.name,
      brand: item.brand,
      price: item.price,
      quantity: item.quantity,
      imageUrl: item.imageUrl ?? null,
      inventoryRemaining: item.inventory,
    })),
    subtotal: cart.total,
    total: cart.total,
  };
}

export default function CartPage() {
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const { data } = await api.get<ApiCartResponse>("/cart");
      return normalizeCartResponse(data);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      itemId,
      quantity,
    }: {
      itemId: string;
      quantity: number;
    }) => {
      await api.patch(`/cart/items/${itemId}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/cart/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const cart = cartQuery.data;
  const items = cart?.items ?? [];

  return (
    <main className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Shopping Cart
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Review Your Items
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Update quantities, remove products, continue shopping, or move to
              checkout.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/catalog"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Continue Shopping
            </Link>

            <Link
              href="/checkout"
              className="inline-flex items-center justify-center rounded-full border border-slate-900 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Go to Checkout
            </Link>
          </div>
        </div>
      </section>

      {cartQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(cartQuery.error)}
        </div>
      ) : null}

      {updateMutation.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(updateMutation.error)}
        </div>
      ) : null}

      {removeMutation.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(removeMutation.error)}
        </div>
      ) : null}

      {cartQuery.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-600 shadow-sm">
          Loading cart...
        </div>
      ) : items.length === 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Your cart is empty
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Browse the catalog and add products to begin checkout.
          </p>
          <Link
            href="/catalog"
            className="mt-6 inline-flex items-center justify-center rounded-full border border-slate-900 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Browse Catalog
          </Link>
        </section>
      ) : (
        <section className="grid gap-8 lg:grid-cols-[1.7fr_0.9fr]">
          <div className="space-y-4">
            {items.map((item) => (
              <article
                key={item.itemId}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-center">
                  <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-slate-100">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <span className="text-sm text-slate-500">No image</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <h2 className="text-xl font-semibold text-slate-900">
                      {item.name}
                    </h2>
                    <p className="text-sm text-slate-600">{item.brand}</p>
                    <p className="text-sm text-slate-600">
                      Unit price:{" "}
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(item.price)}
                      </span>
                    </p>
                    <p className="text-sm text-slate-600">
                      Inventory remaining: {item.inventoryRemaining ?? "N/A"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-medium text-slate-700">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, Math.min(item.inventoryRemaining ?? 99, 99))}
                      value={item.quantity}
                      onChange={(e) => {
                        const rawValue = Number(e.target.value);
                        if (Number.isNaN(rawValue)) return;
                        const maxAllowed = Math.max(
                          1,
                          Math.min(item.inventoryRemaining ?? 99, 99)
                        );
                        const nextValue = Math.min(Math.max(Math.floor(rawValue), 1), maxAllowed);
                        updateMutation.mutate({
                          itemId: item.itemId,
                          quantity: nextValue,
                        });
                      }}
                      className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500"
                    />
                  </div>

                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <p className="text-xl font-bold text-slate-900">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => removeMutation.mutate(item.itemId)}
                      disabled={removeMutation.isPending}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">
              Order Summary
            </h2>

            <div className="mt-6 space-y-4 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Items</span>
                <span>{items.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(cart?.subtotal ?? 0)}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-base">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(cart?.total ?? 0)}
                </span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-slate-900 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Proceed to Checkout
            </Link>
          </aside>
        </section>
      )}
    </main>
  );
}
