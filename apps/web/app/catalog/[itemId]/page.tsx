"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, toErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Item } from "@/lib/types";
import { Button } from "@/components/ui/button";

export default function CatalogItemPage() {
  const params = useParams<{ itemId: string }>();
  const itemId = params.itemId;
  const queryClient = useQueryClient();

  const itemQuery = useQuery({
    queryKey: ["catalog-item", itemId],
    queryFn: async () => {
      const { data } = await api.get(`/catalog/items/${itemId}`);
      return data.item as Item;
    },
    enabled: Boolean(itemId)
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      await api.post("/cart/items", {
        itemId,
        quantity: 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    }
  });

  if (itemQuery.error) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {toErrorMessage(itemQuery.error)}
      </p>
    );
  }

  const item = itemQuery.data;

  return (
    <section className="grid gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <Link href="/catalog" className="text-sm font-medium text-accent hover:underline">
        Back to catalog
      </Link>

      {!item ? (
        <p className="text-sm text-slate-600">Loading item...</p>
      ) : (
        <article className="grid gap-4 md:grid-cols-2">
          <div className="aspect-[16/10] overflow-hidden rounded-lg border border-border bg-slate-50">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">No image</div>
            )}
          </div>

          <div className="grid content-start gap-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">{item.category}</p>
            <h2 className="text-2xl font-semibold">{item.name}</h2>
            <p className="text-sm text-slate-700">{item.description}</p>
            <p className="text-sm text-slate-600">Brand: {item.brand}</p>
            <p className="text-sm text-slate-600">Model: {item.model ?? "N/A"}</p>
            <p className="text-sm text-slate-600">Inventory remaining: {item.quantity}</p>
            <p className="text-2xl font-bold text-accent">{formatCurrency(item.price)}</p>

            {addMutation.error ? (
              <p className="text-sm text-red-700">{toErrorMessage(addMutation.error)}</p>
            ) : null}

            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || item.quantity === 0}>
              {item.quantity === 0
                ? "Out of stock"
                : addMutation.isPending
                  ? "Adding..."
                  : "Add to cart"}
            </Button>
          </div>
        </article>
      )}
    </section>
  );
}
