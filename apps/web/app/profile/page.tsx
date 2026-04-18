"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, toErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

type AddressForm = {
  street: string;
  province: string;
  country: string;
  zip: string;
  phone: string;
};

type PaymentForm = {
  cardHolder: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
};

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  shippingAddress: AddressForm;
  billingAddress: AddressForm;
  payment: PaymentForm;
};

type ApiAddress = {
  street: string;
  province: string;
  country: string;
  zip: string;
  phone?: string | null;
};

type ApiPaymentProfile = {
  cardHolder?: string | null;
  cardLast4?: string | null;
  expiryMonth?: string | null;
  expiryYear?: string | null;
};

type ApiMeResponse = {
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    defaultShippingAddress?: ApiAddress | null;
    defaultBillingAddress?: ApiAddress | null;
    paymentProfile?: ApiPaymentProfile | null;
  };
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

type ApiOrderEntry = {
  quantity: number;
  priceAtPurchase: number;
  item?: {
    name?: string;
  } | null;
};

type ApiHistoryOrder = {
  id: string;
  placedAt: string;
  total: number;
  paymentStatus: string;
  items: ApiOrderEntry[];
};

const emptyAddress: AddressForm = {
  street: "",
  province: "",
  country: "Canada",
  zip: "",
  phone: ""
};

const emptyPayment: PaymentForm = {
  cardHolder: "",
  cardNumber: "",
  expiryMonth: "",
  expiryYear: "",
  cvv: ""
};

function mapAddress(address?: ApiAddress | null): AddressForm {
  if (!address) {
    return { ...emptyAddress };
  }

  return {
    street: address.street ?? "",
    province: address.province ?? "",
    country: address.country ?? "Canada",
    zip: address.zip ?? "",
    phone: address.phone ?? ""
  };
}

function isAddressFilled(address: AddressForm) {
  return Boolean(
    address.street.trim() &&
      address.province.trim() &&
      address.country.trim() &&
      address.zip.trim()
  );
}

function addressesMatch(left: AddressForm, right: AddressForm) {
  return (
    left.street === right.street &&
    left.province === right.province &&
    left.country === right.country &&
    left.zip === right.zip &&
    left.phone === right.phone
  );
}

function AddressEditor({
  title,
  value,
  onChange
}: {
  title: string;
  value: AddressForm;
  onChange: (field: keyof AddressForm, nextValue: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>

      <div className="mt-4 grid gap-3">
        <input
          type="text"
          placeholder="Street"
          value={value.street}
          onChange={(event) => onChange("street", event.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="text"
            placeholder="Province"
            value={value.province}
            onChange={(event) => onChange("province", event.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
          <input
            type="text"
            placeholder="Country"
            value={value.country}
            onChange={(event) => onChange("country", event.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="text"
            placeholder="Postal code"
            value={value.zip}
            onChange={(event) => onChange("zip", event.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
          <input
            type="text"
            placeholder="Phone"
            value={value.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
        </div>
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    shippingAddress: { ...emptyAddress },
    billingAddress: { ...emptyAddress },
    payment: { ...emptyPayment }
  });

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await api.get<ApiMeResponse>("/identity/me");
      return data.user;
    }
  });

  const ordersQuery = useQuery({
    queryKey: ["orders-history"],
    queryFn: async () => {
      const { data } = await api.get("/orders/history");
      const orders = (data.orders ?? []) as ApiHistoryOrder[];

      return orders.map((order) => ({
        id: order.id,
        createdAt: order.placedAt,
        totalAmount: order.total,
        paymentStatus: order.paymentStatus,
        items: order.items.map((item) => ({
          itemName: item.item?.name ?? "Unknown item",
          quantity: item.quantity,
          unitPrice: item.priceAtPurchase
        }))
      })) as Order[];
    }
  });

  useEffect(() => {
    const user = meQuery.data;
    if (!user) {
      return;
    }

    const shippingAddress = mapAddress(user.defaultShippingAddress);
    const billingAddress = mapAddress(
      user.defaultBillingAddress ?? user.defaultShippingAddress
    );

    setForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      shippingAddress,
      billingAddress,
      payment: {
        cardHolder: user.paymentProfile?.cardHolder ?? "",
        cardNumber: "",
        expiryMonth: user.paymentProfile?.expiryMonth ?? "",
        expiryYear: user.paymentProfile?.expiryYear ?? "",
        cvv: ""
      }
    });
    setBillingSameAsShipping(addressesMatch(shippingAddress, billingAddress));
  }, [meQuery.data]);

  useEffect(() => {
    if (!billingSameAsShipping) {
      return;
    }

    setForm((prev) => {
      if (addressesMatch(prev.billingAddress, prev.shippingAddress)) {
        return prev;
      }

      return {
        ...prev,
        billingAddress: {
          ...prev.shippingAddress
        }
      };
    });
  }, [billingSameAsShipping, form.shippingAddress]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const shippingAddress = form.shippingAddress;
      const billingAddress = billingSameAsShipping
        ? shippingAddress
        : form.billingAddress;

      if (
        !isAddressFilled(shippingAddress) ||
        (!billingSameAsShipping && !isAddressFilled(billingAddress))
      ) {
        throw new Error("Shipping and billing defaults must be complete.");
      }

      const payload: Record<string, unknown> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || null,
        shippingAddress: {
          street: shippingAddress.street.trim(),
          province: shippingAddress.province.trim(),
          country: shippingAddress.country.trim(),
          zip: shippingAddress.zip.trim(),
          phone: shippingAddress.phone.trim() || undefined
        },
        billingAddress: {
          street: billingAddress.street.trim(),
          province: billingAddress.province.trim(),
          country: billingAddress.country.trim(),
          zip: billingAddress.zip.trim(),
          phone: billingAddress.phone.trim() || undefined
        }
      };

      const currentPaymentProfile = meQuery.data?.paymentProfile;
      const paymentProfileEdited = Boolean(
        form.payment.cardNumber.trim() ||
          form.payment.cvv.trim() ||
          form.payment.cardHolder.trim() !== (currentPaymentProfile?.cardHolder ?? "") ||
          form.payment.expiryMonth.trim() !== (currentPaymentProfile?.expiryMonth ?? "") ||
          form.payment.expiryYear.trim() !== (currentPaymentProfile?.expiryYear ?? "")
      );

      if (paymentProfileEdited) {
        const normalizedDigits = form.payment.cardNumber.replace(/\D/g, "");
        if (
          !form.payment.cardHolder.trim() ||
          normalizedDigits.length < 12 ||
          !/^(0[1-9]|1[0-2])$/.test(form.payment.expiryMonth.trim()) ||
          !/^\d{4}$/.test(form.payment.expiryYear.trim()) ||
          !/^\d{3,4}$/.test(form.payment.cvv.trim())
        ) {
          throw new Error(
            "Card defaults require holder, full card number, MM expiry month, YYYY expiry year, and CVV."
          );
        }

        payload.creditCard = {
          cardHolder: form.payment.cardHolder.trim(),
          cardNumber: form.payment.cardNumber.trim(),
          expiryMonth: form.payment.expiryMonth.trim(),
          expiryYear: form.payment.expiryYear.trim(),
          cvv: form.payment.cvv.trim()
        };
      }

      const { data } = await api.patch("/identity/me", payload);
      return data;
    },
    onMutate: () => {
      setProfileError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setForm((prev) => ({
        ...prev,
        payment: {
          ...prev.payment,
          cardNumber: "",
          cvv: ""
        }
      }));
    },
    onError: (error) => {
      setProfileError(toErrorMessage(error));
    }
  });

  const orders = ordersQuery.data ?? [];

  const savedCardMask = useMemo(() => {
    const last4 = meQuery.data?.paymentProfile?.cardLast4;
    if (!last4) {
      return null;
    }
    return `**** ${last4}`;
  }, [meQuery.data?.paymentProfile?.cardLast4]);

  return (
    <main className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Profile
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Account</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Maintain personal details, default shipping and billing info, payment profile,
            and purchase history.
          </p>
        </div>
      </section>

      {meQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(meQuery.error)}
        </div>
      ) : null}

      {profileError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {profileError}
        </div>
      ) : null}

      {updateMutation.isSuccess ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Profile defaults updated successfully.
        </div>
      ) : null}

      <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Customer Defaults</h2>

          {meQuery.isLoading ? (
            <p className="mt-5 text-sm text-slate-600">Loading profile...</p>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, firstName: event.target.value }))
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, lastName: event.target.value }))
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="email"
                  value={form.email}
                  readOnly
                  className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-500"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
              </div>

              <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={billingSameAsShipping}
                  onChange={(event) => setBillingSameAsShipping(event.target.checked)}
                />
                Billing address is same as shipping
              </label>

              <div
                className={
                  billingSameAsShipping ? "grid gap-4" : "grid gap-4 lg:grid-cols-2"
                }
              >
                <AddressEditor
                  title="Default Shipping Address"
                  value={form.shippingAddress}
                  onChange={(field, nextValue) =>
                    setForm((prev) => ({
                      ...prev,
                      shippingAddress: {
                        ...prev.shippingAddress,
                        [field]: nextValue
                      }
                    }))
                  }
                />
                {billingSameAsShipping ? (
                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Billing address will automatically mirror your shipping address when you save.
                  </section>
                ) : (
                  <AddressEditor
                    title="Default Billing Address"
                    value={form.billingAddress}
                    onChange={(field, nextValue) =>
                      setForm((prev) => ({
                        ...prev,
                        billingAddress: {
                          ...prev.billingAddress,
                          [field]: nextValue
                        }
                      }))
                    }
                  />
                )}
              </div>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">Default Payment Profile</h3>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Saved card: {savedCardMask ?? "No saved card yet"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Editing these fields saves to your profile when you click
                  "Save Profile Defaults".
                </p>

                <div className="mt-4 grid gap-3">
                  <input
                    type="text"
                    placeholder="Name on card"
                    value={form.payment.cardHolder}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        payment: { ...prev.payment, cardHolder: event.target.value }
                      }))
                    }
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                  />

                  <input
                    type="text"
                    placeholder="Enter full card number to save/update"
                    value={form.payment.cardNumber}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        payment: { ...prev.payment, cardNumber: event.target.value }
                      }))
                    }
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                  />

                  <div className="grid gap-3 md:grid-cols-3">
                    <input
                      type="text"
                      placeholder="MM"
                      value={form.payment.expiryMonth}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          payment: { ...prev.payment, expiryMonth: event.target.value }
                        }))
                      }
                      className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                    />
                    <input
                      type="text"
                      placeholder="YYYY"
                      value={form.payment.expiryYear}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          payment: { ...prev.payment, expiryYear: event.target.value }
                        }))
                      }
                      className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                    />
                    <input
                      type="text"
                      placeholder="CVV"
                      value={form.payment.cvv}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          payment: { ...prev.payment, cvv: event.target.value }
                        }))
                      }
                      className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                    />
                  </div>
                </div>
              </section>

              <button
                type="button"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="rounded-full border border-slate-900 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updateMutation.isPending ? "Saving..." : "Save Profile Defaults"}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Purchase History</h2>

          {ordersQuery.error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {toErrorMessage(ordersQuery.error)}
            </div>
          ) : ordersQuery.isLoading ? (
            <p className="mt-5 text-sm text-slate-600">Loading purchase history...</p>
          ) : orders.length === 0 ? (
            <p className="mt-5 text-sm text-slate-600">No purchases yet.</p>
          ) : (
            <div className="mt-5 space-y-4">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Order #{order.id}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      <p className="text-xs text-slate-500">{order.paymentStatus}</p>
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
