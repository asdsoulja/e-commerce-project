"use client";

import { isAxiosError } from "axios";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

type ApiMeUser = {
  firstName?: string;
  lastName?: string;
  addresses?: ApiAddress[];
};

type ApiMeResponse = {
  user?: ApiMeUser;
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

type ApiCheckoutResponse = {
  approved: boolean;
  message: string;
};

type AuthMode = "login" | "register";

type AuthForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

const emptyAuthForm: AuthForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: ""
};

export default function CheckoutPage() {
  const queryClient = useQueryClient();
  const [useSavedInfo, setUseSavedInfo] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authForm, setAuthForm] = useState<AuthForm>(emptyAuthForm);
  const [authFormError, setAuthFormError] = useState<string | null>(null);
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);

  const [form, setForm] = useState<CheckoutPayload>({
    shippingAddress: {
      fullName: "",
      street: "",
      city: "",
      province: "",
      postalCode: "",
      country: ""
    },
    payment: {
      cardName: "",
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: ""
    }
  });

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiMeResponse>("/identity/me");
        return data.user ?? null;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) {
          return null;
        }

        throw error;
      }
    },
    retry: false
  });

  const isLoggedIn = Boolean(meQuery.data);

  const cartSummaryQuery = useQuery({
    queryKey: ["cart", "checkout-summary"],
    queryFn: async () => {
      const { data } = await api.get<ApiCartSummaryResponse>("/cart");
      return data.cart ?? { total: 0, items: [] };
    }
  });

  const latestSavedAddress = useMemo(() => {
    const addresses = meQuery.data?.addresses ?? [];
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
    if (!useSavedInfo || !latestSavedAddress || !isLoggedIn) {
      return;
    }

    const fullName = [meQuery.data?.firstName, meQuery.data?.lastName]
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
        country: latestSavedAddress.country
      }
    }));
  }, [isLoggedIn, latestSavedAddress, meQuery.data?.firstName, meQuery.data?.lastName, useSavedInfo]);

  const completeAuthSuccess = async (successMessage: string) => {
    setAuthFormError(null);
    setAuthSuccessMessage(successMessage);
    setAuthForm((prev) => ({
      ...prev,
      password: ""
    }));

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["toolbar-session"] }),
      queryClient.invalidateQueries({ queryKey: ["me"] }),
      queryClient.invalidateQueries({ queryKey: ["me-role"] }),
      queryClient.invalidateQueries({ queryKey: ["cart"] }),
      queryClient.invalidateQueries({ queryKey: ["cart", "checkout-summary"] })
    ]);
  };

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data } = await api.post("/identity/login", { email, password });
      return data;
    },
    onSuccess: async () => {
      await completeAuthSuccess("Signed in successfully. Your cart is ready to checkout.");
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }) => {
      const { data } = await api.post("/identity/register", payload);
      return data;
    },
    onSuccess: async () => {
      await completeAuthSuccess(
        "Account created successfully. Your selected items were retained."
      );
    }
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const normalizedAddress: ApiAddressPayload = {
        street: form.shippingAddress.street,
        province: form.shippingAddress.province,
        country: form.shippingAddress.country,
        zip: form.shippingAddress.postalCode
      };

      const payload: ApiCheckoutPayload = {
        shippingAddress: normalizedAddress,
        billingAddress: normalizedAddress
      };

      const { data } = await api.post<ApiCheckoutResponse>("/orders/checkout", payload);
      return data;
    },
    onSuccess: async (data) => {
      if (!data.approved) {
        return;
      }

      queryClient.setQueryData(["cart"], {
        items: [],
        subtotal: 0,
        total: 0
      });
      queryClient.setQueryData(["cart", "toolbar-count"], 0);
      queryClient.setQueryData(["cart", "checkout-summary"], {
        items: [],
        total: 0
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cart"] }),
        queryClient.invalidateQueries({ queryKey: ["orders-history"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] })
      ]);
    }
  });

  const totalAmount = cartSummaryQuery.data?.total ?? 0;
  const totalItems = (cartSummaryQuery.data?.items ?? []).reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const updateShipping = (field: keyof CheckoutPayload["shippingAddress"], value: string) => {
    setForm((prev) => ({
      ...prev,
      shippingAddress: {
        ...prev.shippingAddress,
        [field]: value
      }
    }));
  };

  const updatePayment = (field: keyof CheckoutPayload["payment"], value: string) => {
    setForm((prev) => ({
      ...prev,
      payment: {
        ...prev.payment,
        [field]: value
      }
    }));
  };

  const updateAuthField = (field: keyof AuthForm, value: string) => {
    setAuthFormError(null);
    setAuthSuccessMessage(null);
    setAuthForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const isAuthPending = loginMutation.isPending || registerMutation.isPending;

  const submitAuth = () => {
    const email = authForm.email.trim();
    const password = authForm.password;

    if (!email || !password) {
      setAuthFormError("Email and password are required.");
      return;
    }

    if (password.length < 8) {
      setAuthFormError("Password must be at least 8 characters.");
      return;
    }

    if (authMode === "login") {
      loginMutation.mutate({ email, password });
      return;
    }

    const firstName = authForm.firstName.trim();
    const lastName = authForm.lastName.trim();
    if (!firstName || !lastName) {
      setAuthFormError("First name and last name are required.");
      return;
    }

    registerMutation.mutate({
      firstName,
      lastName,
      email,
      password
    });
  };

  const authError =
    authFormError ??
    (loginMutation.error ? toErrorMessage(loginMutation.error) : null) ??
    (registerMutation.error ? toErrorMessage(registerMutation.error) : null);

  const checkoutDisabled = checkoutMutation.isPending || !isLoggedIn || totalItems === 0;

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
              Keep shopping as guest, then sign in or register right here in checkout.
              Your selected items stay with you after authentication.
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

      {meQuery.isLoading ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Checking your account session...</p>
        </section>
      ) : !isLoggedIn ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                Step 1
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                Sign in or create an account
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Authenticate here to finalize payment, create order history, and retain your cart.
              </p>
            </div>

            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthFormError(null);
                  setAuthSuccessMessage(null);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  authMode === "login"
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthFormError(null);
                  setAuthSuccessMessage(null);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  authMode === "register"
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                Register
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {authMode === "register" ? (
              <>
                <input
                  type="text"
                  placeholder="First name"
                  value={authForm.firstName}
                  onChange={(event) => updateAuthField("firstName", event.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={authForm.lastName}
                  onChange={(event) => updateAuthField("lastName", event.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
              </>
            ) : null}

            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(event) => updateAuthField("email", event.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(event) => updateAuthField("password", event.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          {authError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {authError}
            </div>
          ) : null}

          {authSuccessMessage ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {authSuccessMessage}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={submitAuth}
              disabled={isAuthPending}
              className="rounded-full border border-slate-900 bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAuthPending
                ? "Processing..."
                : authMode === "login"
                  ? "Sign in to Continue"
                  : "Create Account and Continue"}
            </button>

            <Link
              href={authMode === "login" ? "/register" : "/login"}
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {authMode === "login" ? "Need an account?" : "Already have an account?"}
            </Link>
          </div>
        </section>
      ) : hasSavedAddress ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Saved checkout details found</h2>
              <p className="mt-1 text-sm text-slate-600">
                Use your most recent saved address to prefill checkout.
              </p>
            </div>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={useSavedInfo}
                onChange={(event) => setUseSavedInfo(event.target.checked)}
              />
              Use saved info
            </label>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">No saved checkout details yet</h2>
          <p className="mt-1 text-sm text-slate-600">
            Complete an order and your address will be available for faster checkout next time.
          </p>
        </section>
      )}

      {meQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(meQuery.error)}
        </div>
      ) : null}

      {cartSummaryQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(cartSummaryQuery.error)}
        </div>
      ) : null}

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Shipping Information</h2>

          <div className="mt-5 grid gap-4">
            <input
              type="text"
              placeholder="Full name"
              value={form.shippingAddress.fullName}
              onChange={(event) => updateShipping("fullName", event.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
            <input
              type="text"
              placeholder="Street address"
              value={form.shippingAddress.street}
              onChange={(event) => updateShipping("street", event.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="City"
                value={form.shippingAddress.city}
                onChange={(event) => updateShipping("city", event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="text"
                placeholder="Province"
                value={form.shippingAddress.province}
                onChange={(event) => updateShipping("province", event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Postal code"
                value={form.shippingAddress.postalCode}
                onChange={(event) => updateShipping("postalCode", event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="text"
                placeholder="Country"
                value={form.shippingAddress.country}
                onChange={(event) => updateShipping("country", event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Payment Information</h2>

          <div className="mt-5 grid gap-4">
            <input
              type="text"
              placeholder="Name on card"
              value={form.payment.cardName}
              onChange={(event) => updatePayment("cardName", event.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
            <input
              type="text"
              placeholder="Card number"
              value={form.payment.cardNumber}
              onChange={(event) => updatePayment("cardNumber", event.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
            <div className="grid gap-4 md:grid-cols-3">
              <input
                type="text"
                placeholder="MM"
                value={form.payment.expiryMonth}
                onChange={(event) => updatePayment("expiryMonth", event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="text"
                placeholder="YYYY"
                value={form.payment.expiryYear}
                onChange={(event) => updatePayment("expiryYear", event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="text"
                placeholder="CVV"
                value={form.payment.cvv}
                onChange={(event) => updatePayment("cvv", event.target.value)}
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

      {checkoutMutation.data ? (
        <div
          className={
            checkoutMutation.data.approved
              ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              : "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          }
        >
          {checkoutMutation.data.message}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Ready to place your order?</h2>
            <p className="mt-1 text-sm text-slate-600">
              Submit checkout and let the backend validate payment and inventory.
            </p>
            {!isLoggedIn ? (
              <p className="mt-2 text-sm font-medium text-amber-700">
                Please sign in or register above to confirm this order.
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 lg:min-w-[220px]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Total amount
            </p>
            {cartSummaryQuery.isLoading ? (
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
            onClick={() => {
              if (!isLoggedIn) {
                return;
              }
              checkoutMutation.mutate();
            }}
            disabled={checkoutDisabled}
            className="rounded-full border border-slate-900 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!isLoggedIn
              ? "Sign in to Confirm Order"
              : checkoutMutation.isPending
                ? "Processing..."
                : totalItems === 0
                  ? "Cart is Empty"
                  : "Confirm Order"}
          </button>
        </div>
      </section>
    </main>
  );
}
