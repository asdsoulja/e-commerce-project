"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, toErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
};

type OrderItem = {
  itemName: string;
  quantity: number;
  unitPrice: number;
};

type Order = {
  id: string;
  createdAt: string;
  totalAmount: number;
  paymentStatus: string;
  items: OrderItem[];
};

export default function ProfilePage() {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await api.get("/identity/me");
      return data;
    },
  });

  const ordersQuery = useQuery({
    queryKey: ["orders-history"],
    queryFn: async () => {
      const { data } = await api.get("/orders/history");
      return (data.orders ?? []) as Order[];
    },
  });

  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    province: "",
    postalCode: "",
    country: "Canada",
  });

  useEffect(() => {
    const user = meQuery.data?.user;
    if (!user) return;

    setForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      street: user.address?.street ?? "",
      city: user.address?.city ?? "",
      province: user.address?.province ?? "",
      postalCode: user.address?.postalCode ?? "",
      country: user.address?.country ?? "Canada",
    });
  }, [meQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        address: {
          street: form.street,
          city: form.city,
          province: form.province,
          postalCode: form.postalCode,
          country: form.country,
        },
      };

      const { data } = await api.patch("/identity/me", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <main className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Profile
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            My Account
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            View and update your account information and review your purchase
            history.
          </p>
        </div>
      </section>

      {meQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(meQuery.error)}
        </div>
      ) : null}

      {updateMutation.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(updateMutation.error)}
        </div>
      ) : null}

      {updateMutation.isSuccess ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Profile updated successfully.
        </div>
      ) : null}

      <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Personal Information
          </h2>

          {meQuery.isLoading ? (
            <p className="mt-5 text-sm text-slate-600">Loading profile...</p>
          ) : (
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
              </div>

              <input
                type="text"
                placeholder="Street address"
                value={form.street}
                onChange={(e) => updateField("street", e.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
                <input
                  type="text"
                  placeholder="Province"
                  value={form.province}
                  onChange={(e) => updateField("province", e.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Postal code"
                  value={form.postalCode}
                  onChange={(e) => updateField("postalCode", e.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
                <input
                  type="text"
                  placeholder="Country"
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="rounded-full border border-slate-900 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Purchase History
          </h2>

          {ordersQuery.error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {toErrorMessage(ordersQuery.error)}
            </div>
          ) : ordersQuery.isLoading ? (
            <p className="mt-5 text-sm text-slate-600">Loading purchase history...</p>
          ) : ordersQuery.data.length === 0 ? (
            <p className="mt-5 text-sm text-slate-600">
              No purchases yet.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {ordersQuery.data.map((order) => (
                <article
                  key={order.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Order #{order.id}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.paymentStatus}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {order.items.map((item, index) => (
                      <div
                        key={`${order.id}-${index}`}
                        className="flex items-center justify-between text-sm text-slate-600"
                      >
                        <span>
                          {item.itemName} × {item.quantity}
                        </span>
                        <span>{formatCurrency(item.unitPrice)}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}