"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, toErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

type AdminProduct = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  quantity: number;
};

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type AdminOrder = {
  id: string;
  customerEmail: string;
  createdAt: string;
  totalAmount: number;
  paymentStatus: string;
};

type ApiSalesOrder = {
  id: string;
  placedAt: string;
  total: number;
  paymentStatus: string;
  user?: {
    email?: string;
  } | null;
};

export default function AdminPage() {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    customerEmail: "",
    itemName: "",
    dateFrom: "",
    dateTo: "",
  });

  const salesFilters = useMemo(
    () => ({
      customerEmail: filters.customerEmail || undefined,
      itemName: filters.itemName || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    }),
    [filters]
  );

  const inventoryQuery = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: async () => {
      const { data } = await api.get("/admin/inventory");
      return (data.items ?? []) as AdminProduct[];
    },
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await api.get("/admin/users");
      return (data.users ?? []) as AdminUser[];
    },
  });

  const salesQuery = useQuery({
    queryKey: ["admin-sales", salesFilters],
    queryFn: async () => {
      const { data } = await api.get("/admin/sales", { params: salesFilters });
      const orders = (data.orders ?? []) as ApiSalesOrder[];

      return orders.map((order) => ({
        id: order.id,
        customerEmail: order.user?.email ?? "Unknown",
        createdAt: order.placedAt,
        totalAmount: order.total,
        paymentStatus: order.paymentStatus,
      })) as AdminOrder[];
    },
  });

  const inventoryMutation = useMutation({
    mutationFn: async ({
      itemId,
      quantity,
    }: {
      itemId: string;
      quantity: number;
    }) => {
      await api.patch(`/admin/inventory/${itemId}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
    },
  });

  return (
    <main className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Administrator
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Store Management Dashboard
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Review sales history, maintain inventory, and manage customer
            accounts.
          </p>
        </div>
      </section>

      {inventoryQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(inventoryQuery.error)}
        </div>
      ) : null}

      {usersQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(usersQuery.error)}
        </div>
      ) : null}

      {salesQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(salesQuery.error)}
        </div>
      ) : null}

      {inventoryMutation.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(inventoryMutation.error)}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Sales History</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input
            type="text"
            placeholder="Customer email"
            value={filters.customerEmail}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, customerEmail: e.target.value }))
            }
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
          <input
            type="text"
            placeholder="Product name"
            value={filters.itemName}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, itemName: e.target.value }))
            }
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
            }
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
            }
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                <th className="px-3 py-3 font-semibold">Order ID</th>
                <th className="px-3 py-3 font-semibold">Customer</th>
                <th className="px-3 py-3 font-semibold">Date</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {salesQuery.isLoading ? (
                <tr>
                  <td className="px-3 py-4 text-slate-600" colSpan={5}>
                    Loading sales history...
                  </td>
                </tr>
              ) : salesQuery.data?.length ? (
                salesQuery.data.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100">
                    <td className="px-3 py-4 text-slate-900">{order.id}</td>
                    <td className="px-3 py-4 text-slate-600">
                      {order.customerEmail}
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      {order.paymentStatus}
                    </td>
                    <td className="px-3 py-4 font-semibold text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-4 text-slate-600" colSpan={5}>
                    No sales found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Inventory Management
          </h2>

          <div className="mt-5 space-y-4">
            {inventoryQuery.isLoading ? (
              <p className="text-sm text-slate-600">Loading inventory...</p>
            ) : inventoryQuery.data?.length ? (
              inventoryQuery.data.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {item.name}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {item.brand} · {item.category}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Price: {formatCurrency(item.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        defaultValue={item.quantity}
                        min={0}
                        onBlur={(e) => {
                          const rawValue = Number(e.target.value);
                          if (Number.isNaN(rawValue) || rawValue < 0) return;
                          const nextQuantity = Math.floor(rawValue);
                          inventoryMutation.mutate({
                            itemId: item.id,
                            quantity: nextQuantity,
                          });
                        }}
                        className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                      />
                      <span className="text-sm text-slate-600">qty</span>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-600">No inventory items found.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            User Accounts
          </h2>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-3 py-3 font-semibold">Name</th>
                  <th className="px-3 py-3 font-semibold">Email</th>
                  <th className="px-3 py-3 font-semibold">Role</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.isLoading ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-600" colSpan={3}>
                      Loading users...
                    </td>
                  </tr>
                ) : usersQuery.data?.length ? (
                  usersQuery.data.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100">
                      <td className="px-3 py-4 text-slate-900">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="px-3 py-4 text-slate-600">{user.email}</td>
                      <td className="px-3 py-4 text-slate-600">{user.role}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-4 text-slate-600" colSpan={3}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
