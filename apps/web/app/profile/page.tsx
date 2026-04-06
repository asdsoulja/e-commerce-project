"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, toErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Order, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Address = {
  id: string;
  label?: string | null;
  street: string;
  province: string;
  country: string;
  zip: string;
};

type ProfileResponse = User & { addresses?: Address[] };

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({
    firstName: "",
    lastName: "",
    phone: ""
  });

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await api.get("/identity/me");
      return data.user as ProfileResponse;
    }
  });

  const historyQuery = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data } = await api.get("/orders/history");
      return data.orders as Order[];
    }
  });

  useEffect(() => {
    if (!meQuery.data) {
      return;
    }

    setDraft({
      firstName: meQuery.data.firstName,
      lastName: meQuery.data.lastName,
      phone: meQuery.data.phone ?? ""
    });
  }, [meQuery.data]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      await api.patch("/identity/me", {
        firstName: draft.firstName,
        lastName: draft.lastName,
        phone: draft.phone.trim() ? draft.phone.trim() : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    }
  });

  if (meQuery.error) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {toErrorMessage(meQuery.error)}
      </p>
    );
  }

  return (
    <section className="grid gap-4">
      <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-xl font-semibold">Profile</h2>
        {!meQuery.data ? (
          <p className="mt-2 text-sm text-slate-500">Loading profile...</p>
        ) : (
          <form
            className="mt-3 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              updateProfileMutation.mutate();
            }}
          >
            <label className="text-sm">
              First name
              <Input
                value={draft.firstName}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, firstName: event.target.value }))
                }
              />
            </label>

            <label className="text-sm">
              Last name
              <Input
                value={draft.lastName}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, lastName: event.target.value }))
                }
              />
            </label>

            <label className="text-sm">
              Phone
              <Input
                value={draft.phone}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, phone: event.target.value }))
                }
                placeholder="Optional"
              />
            </label>

            <p className="text-sm text-slate-600">Email: {meQuery.data.email}</p>
            <p className="text-sm text-slate-600">Role: {meQuery.data.role}</p>

            {updateProfileMutation.error ? (
              <p className="text-sm text-red-700">{toErrorMessage(updateProfileMutation.error)}</p>
            ) : null}

            {updateProfileMutation.isSuccess ? (
              <p className="text-sm text-emerald-700">Profile updated.</p>
            ) : null}

            <Button type="submit" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? "Saving..." : "Save profile"}
            </Button>
          </form>
        )}
      </article>

      <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="text-lg font-semibold">Saved Addresses</h3>
        {(meQuery.data?.addresses ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">No saved addresses yet.</p>
        ) : (
          <div className="mt-2 grid gap-2">
            {(meQuery.data?.addresses ?? []).map((address) => (
              <div key={address.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium">{address.label ?? "Address"}</p>
                <p>{address.street}</p>
                <p>
                  {address.province}, {address.country} {address.zip}
                </p>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="text-lg font-semibold">Purchase History</h3>
        {(historyQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">No purchases yet.</p>
        ) : (
          <div className="mt-2 grid gap-2">
            {(historyQuery.data ?? []).map((order) => (
              <div key={order.id} className="rounded-md border border-border p-3 text-sm">
                <p>Order ID: {order.id}</p>
                <p>Total: {formatCurrency(order.total)}</p>
                <p>Status: {order.paymentStatus}</p>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
