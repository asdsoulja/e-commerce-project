"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, toErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Item } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: string;
};

type AdminOrder = {
  id: string;
  total: number;
  placedAt: string;
  user: { email: string };
  items: Array<{
    quantity: number;
    priceAtPurchase: number;
    item: {
      name: string;
    };
  }>;
};

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [draftQuantities, setDraftQuantities] = useState<Record<string, string>>({});
  const [customerEmail, setCustomerEmail] = useState("");
  const [itemName, setItemName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [newInventoryItem, setNewInventoryItem] = useState({
    sku: "",
    name: "",
    description: "",
    category: "",
    brand: "",
    model: "",
    imageUrl: "",
    quantity: "0",
    price: "0"
  });

  const salesFilters = useMemo(
    () => ({
      customerEmail: customerEmail || undefined,
      itemName: itemName || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined
    }),
    [customerEmail, itemName, dateFrom, dateTo]
  );

  const inventoryQuery = useQuery({
    queryKey: ["admin", "inventory"],
    queryFn: async () => {
      const { data } = await api.get("/admin/inventory");
      return data.items as Item[];
    }
  });

  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data } = await api.get("/admin/users");
      return data.users as AdminUser[];
    }
  });

  const salesQuery = useQuery({
    queryKey: ["admin", "sales", salesFilters],
    queryFn: async () => {
      const { data } = await api.get("/admin/sales", {
        params: salesFilters
      });
      return data.orders as AdminOrder[];
    }
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async (payload: { itemId: string; quantity: number }) => {
      await api.patch(`/admin/inventory/${payload.itemId}`, { quantity: payload.quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
    }
  });

  const createInventoryMutation = useMutation({
    mutationFn: async () => {
      await api.post("/admin/inventory", {
        sku: newInventoryItem.sku,
        name: newInventoryItem.name,
        description: newInventoryItem.description,
        category: newInventoryItem.category,
        brand: newInventoryItem.brand,
        model: newInventoryItem.model || undefined,
        imageUrl: newInventoryItem.imageUrl || undefined,
        quantity: Number(newInventoryItem.quantity),
        price: Number(newInventoryItem.price)
      });
    },
    onSuccess: () => {
      setNewInventoryItem({
        sku: "",
        name: "",
        description: "",
        category: "",
        brand: "",
        model: "",
        imageUrl: "",
        quantity: "0",
        price: "0"
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
    }
  });

  const firstError =
    inventoryQuery.error ??
    usersQuery.error ??
    salesQuery.error ??
    updateInventoryMutation.error ??
    createInventoryMutation.error;

  return (
    <section className="grid gap-4">
      <h2 className="text-xl font-semibold">Administrator Dashboard</h2>

      {firstError ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {toErrorMessage(firstError)}
        </p>
      ) : null}

      <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold">Inventory Management</h3>

        <form
          className="mb-3 grid gap-2 rounded-md border border-dashed border-border p-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            createInventoryMutation.mutate();
          }}
        >
          <Input
            value={newInventoryItem.sku}
            onChange={(event) =>
              setNewInventoryItem((current) => ({ ...current, sku: event.target.value }))
            }
            placeholder="SKU"
            required
          />
          <Input
            value={newInventoryItem.name}
            onChange={(event) =>
              setNewInventoryItem((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Name"
            required
          />
          <Input
            value={newInventoryItem.category}
            onChange={(event) =>
              setNewInventoryItem((current) => ({ ...current, category: event.target.value }))
            }
            placeholder="Category"
            required
          />
          <Input
            value={newInventoryItem.brand}
            onChange={(event) =>
              setNewInventoryItem((current) => ({ ...current, brand: event.target.value }))
            }
            placeholder="Brand"
            required
          />
          <Input
            value={newInventoryItem.model}
            onChange={(event) =>
              setNewInventoryItem((current) => ({ ...current, model: event.target.value }))
            }
            placeholder="Model"
          />
          <Input
            value={newInventoryItem.imageUrl}
            onChange={(event) =>
              setNewInventoryItem((current) => ({ ...current, imageUrl: event.target.value }))
            }
            placeholder="Image URL"
          />
          <Input
            value={newInventoryItem.price}
            onChange={(event) =>
              setNewInventoryItem((current) => ({ ...current, price: event.target.value }))
            }
            placeholder="Price (number)"
            required
          />
          <Input
            value={newInventoryItem.quantity}
            onChange={(event) =>
              setNewInventoryItem((current) => ({ ...current, quantity: event.target.value }))
            }
            placeholder="Quantity"
            required
          />
          <Input
            className="md:col-span-2"
            value={newInventoryItem.description}
            onChange={(event) =>
              setNewInventoryItem((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Description"
            required
          />
          <Button type="submit" disabled={createInventoryMutation.isPending}>
            {createInventoryMutation.isPending ? "Adding..." : "Add inventory item"}
          </Button>
        </form>

        <div className="grid gap-2">
          {(inventoryQuery.data ?? []).map((item) => (
            <div key={item.id} className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-[1fr_auto_auto]">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-slate-500">
                  {item.brand} • {formatCurrency(item.price)}
                </p>
              </div>
              <Input
                className="w-28"
                value={draftQuantities[item.id] ?? String(item.quantity)}
                onChange={(e) =>
                  setDraftQuantities((current) => ({
                    ...current,
                    [item.id]: e.target.value
                  }))
                }
              />
              <Button
                onClick={() =>
                  updateInventoryMutation.mutate({
                    itemId: item.id,
                    quantity: Number(draftQuantities[item.id] ?? item.quantity)
                  })
                }
              >
                Update
              </Button>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold">Sales History</h3>
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <Input
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
            placeholder="Filter by customer email"
          />
          <Input
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
            placeholder="Filter by product name"
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            placeholder="From"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            placeholder="To"
          />
        </div>
        <div className="grid gap-2">
          {(salesQuery.data ?? []).length === 0 ? (
            <p className="rounded-md border border-border p-3 text-sm text-slate-500">
              No orders found for current filters.
            </p>
          ) : null}
          {(salesQuery.data ?? []).map((order) => (
            <div key={order.id} className="rounded-md border border-border p-3 text-sm">
              <p>Order: {order.id}</p>
              <p>Customer: {order.user.email}</p>
              <p>Date: {new Date(order.placedAt).toLocaleDateString("en-CA")}</p>
              <p>Total: {formatCurrency(order.total)}</p>
              <p>
                Items:{" "}
                {order.items
                  .map(
                    (entry) =>
                      `${entry.item.name} x${entry.quantity} (${formatCurrency(entry.priceAtPurchase)})`
                  )
                  .join(", ")}
              </p>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold">User Accounts</h3>
        <div className="grid gap-2">
          {(usersQuery.data ?? []).map((user) => (
            <div key={user.id} className="rounded-md border border-border p-3 text-sm">
              <p>
                {user.firstName} {user.lastName}
              </p>
              <p>{user.email}</p>
              <p>Role: {user.role}</p>
              <p>Phone: {user.phone ?? "N/A"}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
