"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api, toErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Item } from "@/lib/types";
import { Button } from "@/components/ui/button";

export default function ProductDetailsPage() {
  const params = useParams<{ itemId: string }>();
  const itemId = params?.itemId as string;
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);

  const itemQuery = useQuery({
    queryKey: ["catalog-item", itemId],
    queryFn: async () => {
      const { data } = await api.get(`/catalog/items/${itemId}`);
      return data.item as Item;
    },
    enabled: Boolean(itemId),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      await api.post("/cart/items", { itemId, quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  if (itemQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-600 shadow-sm">
        Loading product details...
      </div>
    );
  }

  if (itemQuery.error) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(itemQuery.error)}
        </div>
        <Link
          href="/catalog"
          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back to catalog
        </Link>
      </div>
    );
  }

  const item = itemQuery.data;

  if (!item) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-600 shadow-sm">
        Product not found.
      </div>
    );
  }

  const isOutOfStock = item.quantity === 0;
  const maxQuantity = Math.max(1, Math.min(item.quantity, 99));

  return (
    <main className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/catalog"
          className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          ← Back to catalog
        </Link>
      </section>

      <section className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2">
        <div className="flex min-h-[360px] items-center justify-center rounded-3xl bg-slate-100">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full rounded-3xl object-cover"
            />
          ) : (
            <div className="text-sm font-medium text-slate-500">No image</div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {item.category}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {item.brand}
              </span>
              {item.quantity > 0 && item.quantity <= 5 ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                  Almost gone
                </span>
              ) : null}
              {isOutOfStock ? (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  Out of stock
                </span>
              ) : null}
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              {item.name}
            </h1>

            <p className="text-lg text-slate-600">{item.description}</p>
          </div>

          <div className="grid gap-3 rounded-2xl bg-slate-50 p-5 text-sm text-slate-700">
            <p>
              <span className="font-semibold text-slate-900">Brand:</span>{" "}
              {item.brand}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Model:</span>{" "}
              {item.model ?? "N/A"}
            </p>
            <p>
              <span className="font-semibold text-slate-900">
                Inventory remaining:
              </span>{" "}
              {item.quantity}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Price:</span>{" "}
              {formatCurrency(item.price)}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Quantity
              </label>
              <input
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={(e) => {
                  const rawValue = Number(e.target.value);
                  if (Number.isNaN(rawValue)) return;
                  const nextValue = Math.floor(rawValue);
                  setQuantity(Math.min(Math.max(nextValue, 1), maxQuantity));
                }}
                className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500"
                disabled={isOutOfStock}
              />
            </div>

            <Button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || isOutOfStock}
            >
              {isOutOfStock ? "Out of stock" : "Add to cart"}
            </Button>
          </div>

          {addMutation.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {toErrorMessage(addMutation.error)}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
