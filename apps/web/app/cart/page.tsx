"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, toErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Cart } from "@/lib/types";
import { Button } from "@/components/ui/button";

export default function CartPage() {
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const { data } = await api.get("/cart");
      return data.cart as Cart;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { itemId: string; quantity: number }) => {
      await api.patch(`/cart/items/${payload.itemId}`, {
        quantity: payload.quantity
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/cart/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    }
  });

  if (cartQuery.error) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {toErrorMessage(cartQuery.error)}
      </p>
    );
  }

  const cart = cartQuery.data;

  return (
    <section className="grid gap-4">
      <h2 className="text-xl font-semibold">Shopping Cart</h2>
      <Link href="/catalog" className="text-sm font-medium text-accent hover:underline">
        Continue shopping
      </Link>

      {(cart?.items ?? []).length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-slate-600 shadow-sm">
          Your cart is currently empty.
        </p>
      ) : (
        <div className="grid gap-3">
          {cart?.items.map((line) => (
            <article
              key={line.itemId}
              className="grid gap-2 rounded-xl border border-border bg-card p-4 shadow-sm md:grid-cols-[1fr_auto]"
            >
              <div>
                <h3 className="font-semibold">{line.name}</h3>
                <p className="text-sm text-slate-500">{line.brand}</p>
                <p className="text-sm text-slate-500">Unit: {formatCurrency(line.price)}</p>
                <p className="text-sm text-slate-500">Line total: {formatCurrency(line.lineTotal)}</p>
                <p className="text-sm text-slate-500">Inventory left: {line.inventory}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    updateMutation.mutate({
                      itemId: line.itemId,
                      quantity: Math.max(1, line.quantity - 1)
                    })
                  }
                >
                  -
                </Button>
                <span className="w-8 text-center text-sm font-semibold">{line.quantity}</span>
                <Button
                  variant="secondary"
                  onClick={() =>
                    updateMutation.mutate({
                      itemId: line.itemId,
                      quantity: Math.min(line.inventory, line.quantity + 1)
                    })
                  }
                  disabled={line.quantity >= line.inventory}
                >
                  +
                </Button>
                <Button variant="danger" onClick={() => removeMutation.mutate(line.itemId)}>
                  Remove
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm text-slate-600">Total due</p>
        <p className="text-2xl font-bold text-accent">{formatCurrency(cart?.total ?? 0)}</p>
      </div>
    </section>
  );
}
