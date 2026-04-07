"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, toErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

type CheckoutPayload = {
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  payment: {
    cardName: string;
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
  };
};

type ApiAddressPayload = {
  street: string;
  province: string;
  country: string;
  zip: string;
};

type ApiCheckoutPayload = {
  billingAddress: ApiAddressPayload;
  shippingAddress: ApiAddressPayload;
};

type ApiAddress = {
  id: string;
  street: string;
  province: string;
  country: string;
  zip: string;
  createdAt: string;
};

type ApiMeResponse = {
  user?: {
    firstName?: string;
    lastName?: string;
    addresses?: ApiAddress[];
  };
};

type ApiCartSummary = {
  total: number;
  items: {
    quantity: number;
  }[];
};

type ApiCartSummaryResponse = {
  cart?: ApiCartSummary;
};

export default function CheckoutPage() {
  const [useSavedInfo, setUseSavedInfo] = useState(true);

  const [form, setForm] = useState<CheckoutPayload>({
    shippingAddress: {
      fullName: "",
      street: "",
      city: "",
      province: "",
      postalCode: "",
      country: "",
    },
    payment: {
      cardName: "",
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
    },
  });

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await api.get<ApiMeResponse>("/identity/me");
      return data;
    },
  });

  const isLoggedIn = useMemo(() => Boolean(meQuery.data?.user), [meQuery.data]);

  const cartSummaryQuery = useQuery({
    queryKey: ["cart", "checkout-summary"],
    queryFn: async () => {
      const { data } = await api.get<ApiCartSummaryResponse>("/cart");
      return data.cart ?? { total: 0, items: [] };
    },
    enabled: isLoggedIn,
  });

  const latestSavedAddress = useMemo(() => {
    const addresses = meQuery.data?.user?.addresses ?? [];

    if (addresses.length === 0) {
      return null;
    }

    return [...addresses].sort((a, b) => {
      const tsA = Date.parse(a.createdAt);
      const tsB = Date.parse(b.createdAt);
      return (Number.isNaN(tsB) ? 0 : tsB) - (Number.isNaN(tsA) ? 0 : tsA);
    })[0];
  }, [meQuery.data]);

  const hasSavedAddress = Boolean(latestSavedAddress);

  useEffect(() => {
    if (!useSavedInfo || !latestSavedAddress) {
      return;
    }

    const fullName = [meQuery.data?.user?.firstName, meQuery.data?.user?.lastName]
      .filter(Boolean)
      .join(" ");

    setForm((prev) => ({
      ...prev,
      shippingAddress: {
        ...prev.shippingAddress,
        fullName: prev.shippingAddress.fullName || fullName,
        street: latestSavedAddress.street,
        province: latestSavedAddress.province,
        postalCode: latestSavedAddress.zip,
        country: latestSavedAddress.country,
      },
    }));
  }, [
    useSavedInfo,
    latestSavedAddress,
    meQuery.data?.user?.firstName,
    meQuery.data?.user?.lastName,
  ]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const normalizedAddress: ApiAddressPayload = {
        street: form.shippingAddress.street,
        province: form.shippingAddress.province,
        country: form.shippingAddress.country,
        zip: form.shippingAddress.postalCode,
      };

      const payload: ApiCheckoutPayload = {
        shippingAddress: normalizedAddress,
        billingAddress: normalizedAddress,
      };

      const { data } = await api.post("/orders/checkout", payload);
      return data;
    },
  });

  const totalAmount = cartSummaryQuery.data?.total ?? 0;
  const totalItems = (cartSummaryQuery.data?.items ?? []).reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const updateShipping = (
    field: keyof CheckoutPayload["shippingAddress"],
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      shippingAddress: {
        ...prev.shippingAddress,
        [field]: value,
      },
    }));
  };

  const updatePayment = (
    field: keyof CheckoutPayload["payment"],
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      payment: {
        ...prev.payment,
        [field]: value,
      },
    }));
  };

  return (
    <main className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Checkout
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Complete Your Order
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Enter shipping and payment details, then submit your order for
              processing.
            </p>
          </div>

          <Link
            href="/cart"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Cart
          </Link>
        </div>
      </section>

      {!isLoggedIn ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-amber-900">
            You are not logged in
          </h2>
          <p className="mt-2 text-sm text-amber-800">
            You can continue filling the checkout form, but you may be prompted
            to log in or register depending on backend rules.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full border border-slate-900 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              Register
            </Link>
          </div>
        </section>
      ) : hasSavedAddress ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Saved checkout details found
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Use your most recent saved address to prefill checkout.
              </p>
            </div>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={useSavedInfo}
                onChange={(e) => setUseSavedInfo(e.target.checked)}
              />
              Use saved info
            </label>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            No saved checkout details yet
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Complete an order and your address will be available for faster
            checkout next time.
          </p>
        </section>
      )}

      {meQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(meQuery.error)}
        </div>
      ) : null}

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Shipping Information
          </h2>

          <div className="mt-5 grid gap-4">
            <input
              type="text"
              placeholder="Full name"
              value={form.shippingAddress.fullName}
              onChange={(e) => updateShipping("fullName", e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
            <input
              type="text"
              placeholder="Street address"
              value={form.shippingAddress.street}
              onChange={(e) => updateShipping("street", e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="City"
                value={form.shippingAddress.city}
                onChange={(e) => updateShipping("city", e.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="text"
                placeholder="Province"
                value={form.shippingAddress.province}
                onChange={(e) => updateShipping("province", e.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Postal code"
                value={form.shippingAddress.postalCode}
                onChange={(e) => updateShipping("postalCode", e.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="text"
                placeholder="Country"
                value={form.shippingAddress.country}
                onChange={(e) => updateShipping("country", e.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Payment Information
          </h2>

          <div className="mt-5 grid gap-4">
            <input
              type="text"
              placeholder="Name on card"
              value={form.payment.cardName}
              onChange={(e) => updatePayment("cardName", e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
            <input
              type="text"
              placeholder="Card number"
              value={form.payment.cardNumber}
              onChange={(e) => updatePayment("cardNumber", e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
            <div className="grid gap-4 md:grid-cols-3">
              <input
                type="text"
                placeholder="MM"
                value={form.payment.expiryMonth}
                onChange={(e) => updatePayment("expiryMonth", e.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="text"
                placeholder="YYYY"
                value={form.payment.expiryYear}
                onChange={(e) => updatePayment("expiryYear", e.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="text"
                placeholder="CVV"
                value={form.payment.cvv}
                onChange={(e) => updatePayment("cvv", e.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
            </div>
          </div>
        </div>
      </section>

      {checkoutMutation.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(checkoutMutation.error)}
        </div>
      ) : null}

      {checkoutMutation.isSuccess ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Order submitted successfully.
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Ready to place your order?
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Submit checkout and let the backend validate payment and inventory.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 lg:min-w-[220px]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Total amount
            </p>
            {!isLoggedIn ? (
              <p className="mt-2 text-sm text-slate-600">Sign in to view total</p>
            ) : cartSummaryQuery.isLoading ? (
              <p className="mt-2 text-sm text-slate-600">Loading total...</p>
            ) : (
              <>
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                  {formatCurrency(totalAmount)}
                </p>
                <p className="text-xs text-slate-500">
                  {totalItems} item{totalItems === 1 ? "" : "s"} in cart
                </p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => checkoutMutation.mutate()}
            disabled={checkoutMutation.isPending}
            className="rounded-full border border-slate-900 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkoutMutation.isPending ? "Processing..." : "Confirm Order"}
          </button>
        </div>
      </section>
    </main>
  );
}
