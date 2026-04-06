"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, toErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Item } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CatalogPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const filters = useMemo(
    () => ({
      search: search || undefined,
      category: category || undefined,
      brand: brand || undefined,
      model: model || undefined,
      sortBy,
      sortOrder
    }),
    [brand, category, model, search, sortBy, sortOrder]
  );

  const catalogQuery = useQuery({
    queryKey: ["catalog", filters],
    queryFn: async () => {
      const { data } = await api.get("/catalog/items", {
        params: filters
      });
      return data.items as Item[];
    }
  });

  const addMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.post("/cart/items", {
        itemId,
        quantity: 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    }
  });

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-sm md:grid-cols-6">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items" />
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" />
        <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand" />
        <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model" />
        <select
          className="rounded-md border border-border bg-white px-3 py-2 text-sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "name" | "price")}
        >
          <option value="name">Sort by name</option>
          <option value="price">Sort by price</option>
        </select>
        <select
          className="rounded-md border border-border bg-white px-3 py-2 text-sm"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      {catalogQuery.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {toErrorMessage(catalogQuery.error)}
        </p>
      ) : null}

      {addMutation.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {toErrorMessage(addMutation.error)}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(catalogQuery.data ?? []).map((item) => (
          <article key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 aspect-[16/10] overflow-hidden rounded-lg border border-border bg-slate-50">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No image
                </div>
              )}
            </div>
            <p className="text-xs uppercase tracking-wide text-slate-500">{item.category}</p>
            <h3 className="text-lg font-semibold">{item.name}</h3>
            <p className="mt-1 text-sm text-slate-700">{item.description}</p>
            <p className="mt-2 text-sm text-slate-500">Brand: {item.brand}</p>
            <p className="text-sm text-slate-500">Model: {item.model ?? "N/A"}</p>
            <p className="text-sm text-slate-500">Inventory: {item.quantity}</p>
            {item.quantity > 0 && item.quantity <= 5 ? (
              <p className="text-sm font-medium text-orange-600">Almost gone</p>
            ) : null}
            <p className="mt-2 text-lg font-bold text-accent">{formatCurrency(item.price)}</p>
            <Link href={`/catalog/${item.id}`} className="mt-2 block text-sm font-medium text-accent hover:underline">
              View details
            </Link>
            <Button
              className="mt-3 w-full"
              onClick={() => addMutation.mutate(item.id)}
              disabled={addMutation.isPending || item.quantity === 0}
            >
              {item.quantity === 0 ? "Out of stock" : "Add to cart"}
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
