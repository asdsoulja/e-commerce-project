"use client";

import { isAxiosError } from "axios";
import Link from "next/link";
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

type CheckoutFormState = {
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

type ApiMeUser = {
  firstName?: string;
  lastName?: string;
  defaultShippingAddress?: ApiAddress | null;
  defaultBillingAddress?: ApiAddress | null;
  paymentProfile?: ApiPaymentProfile | null;
};

type ApiMeResponse = {
  user?: ApiMeUser;
};

type ApiCartSummary = {
  total: number;
  items: Array<{
    quantity: number;
  }>;
};

type ApiCartSummaryResponse = {
  cart?: ApiCartSummary;
};

type ApiCheckoutPayload = {
  shippingAddress: ApiAddress;
  billingAddress: ApiAddress;
  creditCard: PaymentForm;
  useSavedPayment: boolean;
  saveAsDefault: boolean;
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

const emptyAuthForm: AuthForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: ""
};

function mapApiAddressToForm(address?: ApiAddress | null): AddressForm {
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

function sanitizeAddress(address: AddressForm): ApiAddress {
  return {
    street: address.street.trim(),
    province: address.province.trim(),
    country: address.country.trim(),
    zip: address.zip.trim(),
    phone: address.phone.trim() || undefined
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

function isCardReadyForRegister(payment: PaymentForm) {
  return Boolean(
    payment.cardHolder.trim() &&
      payment.cardNumber.replace(/\D/g, "").length >= 12 &&
      /^(0[1-9]|1[0-2])$/.test(payment.expiryMonth.trim()) &&
      /^\d{4}$/.test(payment.expiryYear.trim()) &&
      /^\d{3,4}$/.test(payment.cvv.trim())
  );
}

function AddressFields({
  title,
  value,
  onChange,
  disabled
}: {
  title: string;
  value: AddressForm;
  onChange: (field: keyof AddressForm, nextValue: string) => void;
  disabled?: boolean;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>

      <div className="mt-5 grid gap-4">
        <input
          type="text"
          placeholder="Street address"
          value={value.street}
          onChange={(event) => onChange("street", event.target.value)}
          disabled={disabled}
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <input
            type="text"
            placeholder="Province"
            value={value.province}
            onChange={(event) => onChange("province", event.target.value)}
            disabled={disabled}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          <input
            type="text"
            placeholder="Country"
            value={value.country}
            onChange={(event) => onChange("country", event.target.value)}
            disabled={disabled}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <input
            type="text"
            placeholder="Postal code"
            value={value.zip}
            onChange={(event) => onChange("zip", event.target.value)}
            disabled={disabled}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          <input
            type="text"
            placeholder="Phone"
            value={value.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            disabled={disabled}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>
      </div>
    </section>
  );
}

export default function CheckoutPage() {
  const queryClient = useQueryClient();

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authForm, setAuthForm] = useState<AuthForm>(emptyAuthForm);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<CheckoutFormState>({
    shippingAddress: { ...emptyAddress },
    billingAddress: { ...emptyAddress },
    payment: { ...emptyPayment }
  });

  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [useSavedAddresses, setUseSavedAddresses] = useState(true);
  const [useSavedPayment, setUseSavedPayment] = useState(true);
  const [saveAsDefault, setSaveAsDefault] = useState(true);

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

  const cartSummaryQuery = useQuery({
    queryKey: ["cart", "checkout-summary"],
    queryFn: async () => {
      const { data } = await api.get<ApiCartSummaryResponse>("/cart");
      return data.cart ?? { total: 0, items: [] };
    }
  });

  const isLoggedIn = Boolean(meQuery.data);
  const hasSavedAddresses = Boolean(
    meQuery.data?.defaultShippingAddress || meQuery.data?.defaultBillingAddress
  );
  const hasSavedPaymentProfile = Boolean(meQuery.data?.paymentProfile?.cardLast4);

  useEffect(() => {
    if (!hasSavedAddresses && useSavedAddresses) {
      setUseSavedAddresses(false);
    }
  }, [hasSavedAddresses, useSavedAddresses]);

  useEffect(() => {
    if (!hasSavedPaymentProfile && useSavedPayment) {
      setUseSavedPayment(false);
    }
  }, [hasSavedPaymentProfile, useSavedPayment]);

  useEffect(() => {
    if (!isLoggedIn || !useSavedAddresses) {
      return;
    }

    const shipping = mapApiAddressToForm(meQuery.data?.defaultShippingAddress);
    const billing = mapApiAddressToForm(
      meQuery.data?.defaultBillingAddress ?? meQuery.data?.defaultShippingAddress
    );

    setForm((prev) => ({
      ...prev,
      shippingAddress: shipping,
      billingAddress: billing
    }));
  }, [isLoggedIn, meQuery.data, useSavedAddresses]);

  useEffect(() => {
    if (!isLoggedIn || !useSavedPayment || !hasSavedPaymentProfile) {
      return;
    }

    const paymentProfile = meQuery.data?.paymentProfile;
    setForm((prev) => ({
      ...prev,
      payment: {
        ...prev.payment,
        cardHolder: paymentProfile?.cardHolder ?? "",
        expiryMonth: paymentProfile?.expiryMonth ?? "",
        expiryYear: paymentProfile?.expiryYear ?? "",
        cardNumber: "",
        cvv: ""
      }
    }));
  }, [hasSavedPaymentProfile, isLoggedIn, meQuery.data, useSavedPayment]);

  useEffect(() => {
    if (!billingSameAsShipping) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      billingAddress: {
        ...prev.shippingAddress
      }
    }));
  }, [billingSameAsShipping, form.shippingAddress]);

  const finishAuth = async (message: string) => {
    setAuthError(null);
    setAuthSuccess(message);
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
      await finishAuth("Signed in successfully. Your cart is ready to checkout.");
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post("/identity/register", payload);
      return data;
    },
    onSuccess: async () => {
      await finishAuth(
        "Account created successfully with your checkout defaults."
      );
    }
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const shippingAddress = sanitizeAddress(form.shippingAddress);
      const billingAddress = billingSameAsShipping
        ? shippingAddress
        : sanitizeAddress(form.billingAddress);

      const shouldUseSavedPayment =
        useSavedPayment && hasSavedPaymentProfile && form.payment.cardNumber.trim().length === 0;

      const payload: ApiCheckoutPayload = {
        shippingAddress,
        billingAddress,
        creditCard: {
          cardHolder: form.payment.cardHolder.trim(),
          cardNumber: form.payment.cardNumber.trim(),
          expiryMonth: form.payment.expiryMonth.trim(),
          expiryYear: form.payment.expiryYear.trim(),
          cvv: form.payment.cvv.trim()
        },
        useSavedPayment: shouldUseSavedPayment,
        saveAsDefault
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

  const updateShipping = (field: keyof AddressForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      shippingAddress: {
        ...prev.shippingAddress,
        [field]: value
      }
    }));
  };

  const updateBilling = (field: keyof AddressForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      billingAddress: {
        ...prev.billingAddress,
        [field]: value
      }
    }));
  };

  const updatePayment = (field: keyof PaymentForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      payment: {
        ...prev.payment,
        [field]: value
      }
    }));
  };

  const updateAuth = (field: keyof AuthForm, value: string) => {
    setAuthError(null);
    setAuthSuccess(null);
    setAuthForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const submitAuth = () => {
    const email = authForm.email.trim();
    const password = authForm.password;

    if (!email || !password) {
      setAuthError("Email and password are required.");
      return;
    }

    if (password.length < 8) {
      setAuthError("Password must be at least 8 characters.");
      return;
    }

    if (authMode === "login") {
      loginMutation.mutate({ email, password });
      return;
    }

    const firstName = authForm.firstName.trim();
    const lastName = authForm.lastName.trim();
    if (!firstName || !lastName) {
      setAuthError("First name and last name are required for registration.");
      return;
    }

    const billingAddress = billingSameAsShipping ? form.shippingAddress : form.billingAddress;

    if (!isAddressFilled(form.shippingAddress) || !isAddressFilled(billingAddress)) {
      setAuthError("Complete shipping and billing address fields before registering.");
      return;
    }

    if (!isCardReadyForRegister(form.payment)) {
      setAuthError(
        "Enter full payment details (including card number and CVV) to register."
      );
      return;
    }

    registerMutation.mutate({
      firstName,
      lastName,
      email,
      password,
      phone: form.shippingAddress.phone.trim() || undefined,
      shippingAddress: sanitizeAddress(form.shippingAddress),
      billingAddress: sanitizeAddress(billingAddress),
      creditCard: {
        cardHolder: form.payment.cardHolder.trim(),
        cardNumber: form.payment.cardNumber.trim(),
        expiryMonth: form.payment.expiryMonth.trim(),
        expiryYear: form.payment.expiryYear.trim(),
        cvv: form.payment.cvv.trim()
      }
    });
  };

  const isAuthPending = loginMutation.isPending || registerMutation.isPending;

  const authRequestError =
    authError ??
    (loginMutation.error ? toErrorMessage(loginMutation.error) : null) ??
    (registerMutation.error ? toErrorMessage(registerMutation.error) : null);

  const checkoutDisabled = useMemo(() => {
    if (!isLoggedIn || checkoutMutation.isPending || totalItems === 0) {
      return true;
    }

    if (!isAddressFilled(form.shippingAddress)) {
      return true;
    }

    if (!billingSameAsShipping && !isAddressFilled(form.billingAddress)) {
      return true;
    }

    if (!form.payment.cardHolder.trim()) {
      return true;
    }
    if (!/^(0[1-9]|1[0-2])$/.test(form.payment.expiryMonth.trim())) {
      return true;
    }
    if (!/^\d{4}$/.test(form.payment.expiryYear.trim())) {
      return true;
    }
    if (!/^\d{3,4}$/.test(form.payment.cvv.trim())) {
      return true;
    }

    if (useSavedPayment && hasSavedPaymentProfile && !form.payment.cardNumber.trim()) {
      return false;
    }

    return form.payment.cardNumber.replace(/\D/g, "").length < 12;
  }, [
    billingSameAsShipping,
    checkoutMutation.isPending,
    form.billingAddress,
    form.payment,
    form.shippingAddress,
    hasSavedPaymentProfile,
    isLoggedIn,
    totalItems,
    useSavedPayment
  ]);

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
              Continue as guest, then sign in or register in-place. Your cart stays
              intact through authentication.
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
          <p className="text-sm text-slate-600">Checking account session...</p>
        </section>
      ) : !isLoggedIn ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                Step 1
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                Sign in or register
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Registering here uses your checkout address and payment details as defaults.
              </p>
            </div>

            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError(null);
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
                  setAuthError(null);
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
                  onChange={(event) => updateAuth("firstName", event.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={authForm.lastName}
                  onChange={(event) => updateAuth("lastName", event.target.value)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
              </>
            ) : null}

            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(event) => updateAuth("email", event.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(event) => updateAuth("password", event.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          {authRequestError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {authRequestError}
            </div>
          ) : null}

          {authSuccess ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {authSuccess}
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
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Checkout Defaults</h2>

          <div className="mt-5 grid gap-3">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={useSavedAddresses}
                onChange={(event) => setUseSavedAddresses(event.target.checked)}
                disabled={!hasSavedAddresses}
              />
              Use saved shipping and billing addresses
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={useSavedPayment}
                onChange={(event) => setUseSavedPayment(event.target.checked)}
                disabled={!hasSavedPaymentProfile}
              />
              Use saved payment profile
              {hasSavedPaymentProfile ? (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  **** {meQuery.data?.paymentProfile?.cardLast4}
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                  No saved card
                </span>
              )}
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={saveAsDefault}
                onChange={(event) => setSaveAsDefault(event.target.checked)}
              />
              Save these checkout details as my defaults
            </label>
          </div>
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

      <div className="grid gap-8 lg:grid-cols-2">
        <AddressFields
          title="Shipping Address"
          value={form.shippingAddress}
          onChange={updateShipping}
        />

        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-slate-900">Billing Address</h2>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">
                <input
                  type="checkbox"
                  checked={billingSameAsShipping}
                  onChange={(event) => setBillingSameAsShipping(event.target.checked)}
                />
                Same as shipping
              </label>
            </div>
          </section>

          {billingSameAsShipping ? (
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <p className="text-sm text-slate-600">
                Billing address will match shipping address.
              </p>
            </section>
          ) : (
            <AddressFields
              title="Billing Address Details"
              value={form.billingAddress}
              onChange={updateBilling}
            />
          )}
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Payment Information</h2>

        <div className="mt-5 grid gap-4">
          <input
            type="text"
            placeholder="Name on card"
            value={form.payment.cardHolder}
            onChange={(event) => updatePayment("cardHolder", event.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
          <input
            type="text"
            placeholder={
              useSavedPayment && hasSavedPaymentProfile
                ? "Card number (optional when using saved profile)"
                : "Card number"
            }
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

          {useSavedPayment && hasSavedPaymentProfile ? (
            <p className="text-xs text-slate-500">
              Saved profile selected. Leave card number empty to reuse ****{" "}
              {meQuery.data?.paymentProfile?.cardLast4}.
            </p>
          ) : null}
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
                Sign in or register above to confirm this order.
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
