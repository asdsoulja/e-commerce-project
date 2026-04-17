"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, toErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

type AdminProduct = {
  id: string;
  sku: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  model?: string | null;
  imageUrl?: string | null;
  price: number;
  quantity: number;
};

type AddressDefaults = {
  street: string;
  province: string;
  country: string;
  zip: string;
  phone?: string | null;
};

type PaymentProfile = {
  cardLast4?: string | null;
};

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone?: string | null;
  defaultShippingAddress?: AddressDefaults | null;
  defaultBillingAddress?: AddressDefaults | null;
  paymentProfile?: PaymentProfile | null;
};

type AdminOrderItem = {
  quantity: number;
  priceAtPurchase: number;
  item?: {
    name?: string;
    sku?: string;
  } | null;
};

type AdminOrder = {
  id: string;
  placedAt: string;
  total: number;
  paymentStatus: string;
  user?: {
    email?: string;
  } | null;
  items: AdminOrderItem[];
  shippingAddress?: AddressDefaults | null;
  billingAddress?: AddressDefaults | null;
};

type UserAddressForm = {
  street: string;
  province: string;
  country: string;
  zip: string;
  phone: string;
};

type UserPaymentForm = {
  cardHolder: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
};

type UserEditForm = {
  firstName: string;
  lastName: string;
  phone: string;
  shippingAddress: UserAddressForm;
  billingAddress: UserAddressForm;
  payment: UserPaymentForm;
};

const emptyInventoryForm = {
  sku: "",
  name: "",
  description: "",
  category: "",
  brand: "",
  model: "",
  imageUrl: "",
  quantity: "",
  price: ""
};

const emptyAddressForm: UserAddressForm = {
  street: "",
  province: "",
  country: "Canada",
  zip: "",
  phone: ""
};

const emptyUserEditForm: UserEditForm = {
  firstName: "",
  lastName: "",
  phone: "",
  shippingAddress: { ...emptyAddressForm },
  billingAddress: { ...emptyAddressForm },
  payment: {
    cardHolder: "",
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: ""
  }
};

function mapAddressToForm(address?: AddressDefaults | null): UserAddressForm {
  if (!address) {
    return { ...emptyAddressForm };
  }

  return {
    street: address.street ?? "",
    province: address.province ?? "",
    country: address.country ?? "Canada",
    zip: address.zip ?? "",
    phone: address.phone ?? ""
  };
}

function sanitizeAddress(address: UserAddressForm) {
  return {
    street: address.street.trim(),
    province: address.province.trim(),
    country: address.country.trim(),
    zip: address.zip.trim(),
    phone: address.phone.trim() || undefined
  };
}

function isAddressFilled(address: UserAddressForm) {
  return Boolean(
    address.street.trim() &&
      address.province.trim() &&
      address.country.trim() &&
      address.zip.trim()
  );
}

function toInventoryForm(item: AdminProduct) {
  return {
    sku: item.sku,
    name: item.name,
    description: item.description,
    category: item.category,
    brand: item.brand,
    model: item.model ?? "",
    imageUrl: item.imageUrl ?? "",
    quantity: String(item.quantity),
    price: String(item.price)
  };
}

function AddressEditor({
  title,
  value,
  onChange
}: {
  title: string;
  value: UserAddressForm;
  onChange: (field: keyof UserAddressForm, nextValue: string) => void;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <div className="mt-3 grid gap-3">
        <input
          type="text"
          placeholder="Street"
          value={value.street}
          onChange={(event) => onChange("street", event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Province"
            value={value.province}
            onChange={(event) => onChange("province", event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
          <input
            type="text"
            placeholder="Country"
            value={value.country}
            onChange={(event) => onChange("country", event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Postal code"
            value={value.zip}
            onChange={(event) => onChange("zip", event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
          <input
            type="text"
            placeholder="Phone"
            value={value.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    customerEmail: "",
    itemName: "",
    dateFrom: "",
    dateTo: ""
  });

  const [newItemForm, setNewItemForm] = useState(emptyInventoryForm);
  const [newItemFormError, setNewItemFormError] = useState<string | null>(null);
  const [newItemFormSuccess, setNewItemFormSuccess] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemForm, setEditItemForm] = useState(emptyInventoryForm);
  const [editItemFormError, setEditItemFormError] = useState<string | null>(null);
  const [inventoryActionSuccess, setInventoryActionSuccess] = useState<string | null>(null);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<UserEditForm>(emptyUserEditForm);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);
  const [showAllSales, setShowAllSales] = useState(false);

  const salesFilters = useMemo(
    () => ({
      customerEmail: filters.customerEmail || undefined,
      itemName: filters.itemName || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined
    }),
    [filters]
  );

  const inventoryQuery = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: async () => {
      const { data } = await api.get("/admin/inventory");
      return (data.items ?? []) as AdminProduct[];
    }
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await api.get("/admin/users");
      return (data.users ?? []) as AdminUser[];
    }
  });

  const salesQuery = useQuery({
    queryKey: ["admin-sales", salesFilters],
    queryFn: async () => {
      const { data } = await api.get("/admin/sales", { params: salesFilters });
      return (data.orders ?? []) as AdminOrder[];
    }
  });

  const selectedEditingUser = useMemo(
    () => usersQuery.data?.find((user) => user.id === editingUserId) ?? null,
    [editingUserId, usersQuery.data]
  );

  const salesOrders = salesQuery.data ?? [];
  const visibleSalesOrders = showAllSales ? salesOrders : salesOrders.slice(0, 5);
  const hasCollapsibleSales = salesOrders.length > 5;

  const createInventoryMutation = useMutation({
    mutationFn: async (payload: {
      sku: string;
      name: string;
      description: string;
      category: string;
      brand: string;
      model?: string;
      imageUrl?: string;
      quantity: number;
      price: number;
    }) => {
      await api.post("/admin/inventory", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      setNewItemForm(emptyInventoryForm);
      setNewItemFormError(null);
      setNewItemFormSuccess("Product added to inventory.");
      setInventoryActionSuccess(null);
      setEditItemFormError(null);
    }
  });

  const editInventoryMutation = useMutation({
    mutationFn: async ({
      itemId,
      payload
    }: {
      itemId: string;
      payload: {
        sku: string;
        name: string;
        description: string;
        category: string;
        brand: string;
        model: string | null;
        imageUrl: string | null;
        quantity: number;
        price: number;
      };
    }) => {
      await api.patch(`/admin/inventory/${itemId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      setEditingItemId(null);
      setEditItemForm(emptyInventoryForm);
      setEditItemFormError(null);
      setInventoryActionSuccess("Product updated.");
      setNewItemFormSuccess(null);
    }
  });

  const deleteInventoryMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/admin/inventory/${itemId}`);
    },
    onSuccess: (_data, itemId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      if (editingItemId === itemId) {
        setEditingItemId(null);
        setEditItemForm(emptyInventoryForm);
        setEditItemFormError(null);
      }
      setInventoryActionSuccess("Product deleted.");
      setNewItemFormSuccess(null);
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({
      userId,
      payload
    }: {
      userId: string;
      payload: Record<string, unknown>;
    }) => {
      await api.patch(`/admin/users/${userId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setUserFormError(null);
      setUserActionSuccess("User account defaults updated.");
      setUserForm((prev) => ({
        ...prev,
        payment: {
          ...prev.payment,
          cardNumber: "",
          cvv: ""
        }
      }));
    }
  });

  const handleCreateInventoryItem = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNewItemFormError(null);
    setNewItemFormSuccess(null);
    setInventoryActionSuccess(null);

    const sku = newItemForm.sku.trim();
    const name = newItemForm.name.trim();
    const description = newItemForm.description.trim();
    const category = newItemForm.category.trim();
    const brand = newItemForm.brand.trim();
    const model = newItemForm.model.trim();
    const imageUrl = newItemForm.imageUrl.trim();
    const quantity = Number(newItemForm.quantity);
    const price = Number(newItemForm.price);

    if (!sku || !name || !description || !category || !brand) {
      setNewItemFormError("Please fill out all required product fields.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      setNewItemFormError("Quantity must be a whole number greater than or equal to 0.");
      return;
    }

    if (!Number.isInteger(price) || price <= 0) {
      setNewItemFormError("Price must be a whole number greater than 0.");
      return;
    }

    createInventoryMutation.mutate({
      sku,
      name,
      description,
      category,
      brand,
      model: model || undefined,
      imageUrl: imageUrl || undefined,
      quantity,
      price
    });
  };

  const startEditingItem = (item: AdminProduct) => {
    setEditingItemId(item.id);
    setEditItemForm(toInventoryForm(item));
    setEditItemFormError(null);
    setInventoryActionSuccess(null);
    setNewItemFormSuccess(null);
  };

  const cancelEditingItem = () => {
    setEditingItemId(null);
    setEditItemForm(emptyInventoryForm);
    setEditItemFormError(null);
  };

  const handleEditInventoryItem = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEditItemFormError(null);
    setInventoryActionSuccess(null);
    setNewItemFormSuccess(null);

    if (!editingItemId) {
      setEditItemFormError("Please pick an item to edit.");
      return;
    }

    const sku = editItemForm.sku.trim();
    const name = editItemForm.name.trim();
    const description = editItemForm.description.trim();
    const category = editItemForm.category.trim();
    const brand = editItemForm.brand.trim();
    const model = editItemForm.model.trim();
    const imageUrl = editItemForm.imageUrl.trim();
    const quantity = Number(editItemForm.quantity);
    const price = Number(editItemForm.price);

    if (!sku || !name || !description || !category || !brand) {
      setEditItemFormError("Please fill out all required product fields.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      setEditItemFormError("Quantity must be a whole number greater than or equal to 0.");
      return;
    }

    if (!Number.isInteger(price) || price <= 0) {
      setEditItemFormError("Price must be a whole number greater than 0.");
      return;
    }

    editInventoryMutation.mutate({
      itemId: editingItemId,
      payload: {
        sku,
        name,
        description,
        category,
        brand,
        model: model || null,
        imageUrl: imageUrl || null,
        quantity,
        price
      }
    });
  };

  const handleDeleteInventoryItem = (item: AdminProduct) => {
    const confirmed = window.confirm(
      `Delete "${item.name}" (${item.sku}) from inventory? This action cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setInventoryActionSuccess(null);
    setNewItemFormSuccess(null);
    setEditItemFormError(null);
    deleteInventoryMutation.mutate(item.id);
  };

  const startEditingUser = (user: AdminUser) => {
    setEditingUserId(user.id);
    setUserFormError(null);
    setUserActionSuccess(null);
    setUserForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      phone: user.phone ?? "",
      shippingAddress: mapAddressToForm(user.defaultShippingAddress),
      billingAddress: mapAddressToForm(
        user.defaultBillingAddress ?? user.defaultShippingAddress
      ),
      payment: {
        cardHolder: "",
        cardNumber: "",
        expiryMonth: "",
        expiryYear: "",
        cvv: ""
      }
    });
  };

  const cancelEditingUser = () => {
    setEditingUserId(null);
    setUserForm(emptyUserEditForm);
    setUserFormError(null);
  };

  const handleSaveUser = () => {
    setUserFormError(null);
    setUserActionSuccess(null);

    if (!editingUserId) {
      setUserFormError("Pick a user to edit first.");
      return;
    }

    if (!userForm.firstName.trim() || !userForm.lastName.trim()) {
      setUserFormError("First name and last name are required.");
      return;
    }

    if (!isAddressFilled(userForm.shippingAddress) || !isAddressFilled(userForm.billingAddress)) {
      setUserFormError("Shipping and billing defaults must be complete.");
      return;
    }

    const payload: Record<string, unknown> = {
      firstName: userForm.firstName.trim(),
      lastName: userForm.lastName.trim(),
      phone: userForm.phone.trim() || null,
      shippingAddress: sanitizeAddress(userForm.shippingAddress),
      billingAddress: sanitizeAddress(userForm.billingAddress)
    };

    const paymentProfileEdited = Boolean(
      userForm.payment.cardHolder.trim() ||
        userForm.payment.cardNumber.trim() ||
        userForm.payment.expiryMonth.trim() ||
        userForm.payment.expiryYear.trim() ||
        userForm.payment.cvv.trim()
    );

    if (paymentProfileEdited) {
      const normalizedDigits = userForm.payment.cardNumber.replace(/\D/g, "");
      if (
        !userForm.payment.cardHolder.trim() ||
        normalizedDigits.length < 12 ||
        !/^(0[1-9]|1[0-2])$/.test(userForm.payment.expiryMonth.trim()) ||
        !/^\d{4}$/.test(userForm.payment.expiryYear.trim()) ||
        !/^\d{3,4}$/.test(userForm.payment.cvv.trim())
      ) {
        setUserFormError(
          "Card updates require holder, full card number, MM expiry month, YYYY expiry year, and CVV."
        );
        return;
      }

      payload.creditCard = {
        cardHolder: userForm.payment.cardHolder.trim(),
        cardNumber: userForm.payment.cardNumber.trim(),
        expiryMonth: userForm.payment.expiryMonth.trim(),
        expiryYear: userForm.payment.expiryYear.trim(),
        cvv: userForm.payment.cvv.trim()
      };
    }

    updateUserMutation.mutate({
      userId: editingUserId,
      payload
    });
  };

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
            Review sales details, maintain inventory, and edit customer account defaults.
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
      {editInventoryMutation.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(editInventoryMutation.error)}
        </div>
      ) : null}
      {createInventoryMutation.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(createInventoryMutation.error)}
        </div>
      ) : null}
      {deleteInventoryMutation.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(deleteInventoryMutation.error)}
        </div>
      ) : null}
      {updateUserMutation.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(updateUserMutation.error)}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Sales History</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input
            type="text"
            placeholder="Customer email"
            value={filters.customerEmail}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, customerEmail: event.target.value }))
            }
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
          <input
            type="text"
            placeholder="Product name"
            value={filters.itemName}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, itemName: event.target.value }))
            }
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))
            }
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, dateTo: event.target.value }))
            }
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
        </div>

        <div className="mt-5 space-y-4">
          {salesQuery.isLoading ? (
            <p className="text-sm text-slate-600">Loading sales history...</p>
          ) : salesOrders.length ? (
            <>
              {visibleSalesOrders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Order #{order.id}</p>
                      <p className="text-xs text-slate-500">
                        {order.user?.email ?? "Unknown customer"} ·{" "}
                        {new Date(order.placedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(order.total)}
                      </p>
                      <p className="text-xs text-slate-500">{order.paymentStatus}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Order Items
                    </p>
                    <div className="mt-2 space-y-2">
                      {order.items.map((item, index) => (
                        <div
                          key={`${order.id}-item-${index}`}
                          className="flex items-center justify-between text-sm text-slate-600"
                        >
                          <span>
                            {item.item?.name ?? "Unknown"} ({item.item?.sku ?? "N/A"}) ×{" "}
                            {item.quantity}
                          </span>
                          <span>{formatCurrency(item.priceAtPurchase)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
              {hasCollapsibleSales ? (
                <button
                  type="button"
                  onClick={() => setShowAllSales((prev) => !prev)}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  {showAllSales ? "Show Latest 5 Orders" : `Show All ${salesOrders.length} Orders`}
                </button>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-600">No sales found.</p>
          )}
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Inventory Management</h2>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-lg font-semibold text-slate-900">Add New Product</h3>
            <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleCreateInventoryItem}>
              <input
                type="text"
                placeholder="SKU *"
                value={newItemForm.sku}
                onChange={(event) =>
                  setNewItemForm((prev) => ({ ...prev, sku: event.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="text"
                placeholder="Product name *"
                value={newItemForm.name}
                onChange={(event) =>
                  setNewItemForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="text"
                placeholder="Category *"
                value={newItemForm.category}
                onChange={(event) =>
                  setNewItemForm((prev) => ({ ...prev, category: event.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="text"
                placeholder="Brand *"
                value={newItemForm.brand}
                onChange={(event) =>
                  setNewItemForm((prev) => ({ ...prev, brand: event.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="text"
                placeholder="Model (optional)"
                value={newItemForm.model}
                onChange={(event) =>
                  setNewItemForm((prev) => ({ ...prev, model: event.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="url"
                placeholder="Image URL (optional)"
                value={newItemForm.imageUrl}
                onChange={(event) =>
                  setNewItemForm((prev) => ({ ...prev, imageUrl: event.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="number"
                min={0}
                step={1}
                placeholder="Quantity *"
                value={newItemForm.quantity}
                onChange={(event) =>
                  setNewItemForm((prev) => ({ ...prev, quantity: event.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="number"
                min={1}
                step={1}
                placeholder="Price CAD *"
                value={newItemForm.price}
                onChange={(event) =>
                  setNewItemForm((prev) => ({ ...prev, price: event.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <textarea
                placeholder="Description *"
                value={newItemForm.description}
                onChange={(event) =>
                  setNewItemForm((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={3}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 md:col-span-2"
              />
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={createInventoryMutation.isPending}
                  className="inline-flex items-center justify-center rounded-full border border-slate-900 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createInventoryMutation.isPending ? "Adding product..." : "Add Product"}
                </button>
              </div>
            </form>
            {newItemFormError ? <p className="mt-3 text-sm text-red-700">{newItemFormError}</p> : null}
            {newItemFormSuccess ? (
              <p className="mt-3 text-sm text-emerald-700">{newItemFormSuccess}</p>
            ) : null}
          </div>

          {inventoryActionSuccess ? (
            <p className="mt-4 text-sm text-emerald-700">{inventoryActionSuccess}</p>
          ) : null}
          {editItemFormError ? (
            <p className="mt-4 text-sm text-red-700">{editItemFormError}</p>
          ) : null}

          <div className="mt-5 space-y-4">
            {inventoryQuery.isLoading ? (
              <p className="text-sm text-slate-600">Loading inventory...</p>
            ) : inventoryQuery.data?.length ? (
              inventoryQuery.data.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                      <p className="text-sm text-slate-600">SKU: {item.sku}</p>
                      <p className="text-sm text-slate-600">
                        {item.brand} · {item.category}
                      </p>
                      <p className="text-sm text-slate-600">
                        Price: {formatCurrency(item.price)}
                      </p>
                      <p className="text-sm text-slate-600">Quantity in stock: {item.quantity}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditingItem(item)}
                        className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteInventoryItem(item)}
                        disabled={deleteInventoryMutation.isPending}
                        className="inline-flex items-center justify-center rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deleteInventoryMutation.isPending ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>

                  {editingItemId === item.id ? (
                    <form
                      className="mt-4 grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-2"
                      onSubmit={handleEditInventoryItem}
                    >
                      <input
                        type="text"
                        placeholder="SKU *"
                        value={editItemForm.sku}
                        onChange={(event) =>
                          setEditItemForm((prev) => ({ ...prev, sku: event.target.value }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                      />
                      <input
                        type="text"
                        placeholder="Product name *"
                        value={editItemForm.name}
                        onChange={(event) =>
                          setEditItemForm((prev) => ({ ...prev, name: event.target.value }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                      />
                      <input
                        type="text"
                        placeholder="Category *"
                        value={editItemForm.category}
                        onChange={(event) =>
                          setEditItemForm((prev) => ({ ...prev, category: event.target.value }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                      />
                      <input
                        type="text"
                        placeholder="Brand *"
                        value={editItemForm.brand}
                        onChange={(event) =>
                          setEditItemForm((prev) => ({ ...prev, brand: event.target.value }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                      />
                      <input
                        type="text"
                        placeholder="Model (optional)"
                        value={editItemForm.model}
                        onChange={(event) =>
                          setEditItemForm((prev) => ({ ...prev, model: event.target.value }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                      />
                      <input
                        type="url"
                        placeholder="Image URL (optional)"
                        value={editItemForm.imageUrl}
                        onChange={(event) =>
                          setEditItemForm((prev) => ({ ...prev, imageUrl: event.target.value }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                      />
                      <input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="Quantity *"
                        value={editItemForm.quantity}
                        onChange={(event) =>
                          setEditItemForm((prev) => ({ ...prev, quantity: event.target.value }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                      />
                      <input
                        type="number"
                        min={1}
                        step={1}
                        placeholder="Price CAD *"
                        value={editItemForm.price}
                        onChange={(event) =>
                          setEditItemForm((prev) => ({ ...prev, price: event.target.value }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                      />
                      <textarea
                        placeholder="Description *"
                        value={editItemForm.description}
                        onChange={(event) =>
                          setEditItemForm((prev) => ({ ...prev, description: event.target.value }))
                        }
                        rows={3}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 md:col-span-2"
                      />
                      <div className="flex items-center gap-2 md:col-span-2">
                        <button
                          type="submit"
                          disabled={editInventoryMutation.isPending}
                          className="inline-flex items-center justify-center rounded-full border border-slate-900 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {editInventoryMutation.isPending ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingItem}
                          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-600">No inventory items found.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">User Accounts</h2>
          <p className="mt-1 text-sm text-slate-600">
            Update customer contact details, default addresses, and payment profile.
          </p>

          {userActionSuccess ? (
            <p className="mt-4 text-sm text-emerald-700">{userActionSuccess}</p>
          ) : null}
          {userFormError ? <p className="mt-4 text-sm text-red-700">{userFormError}</p> : null}

          <div className="mt-5 space-y-3">
            {usersQuery.isLoading ? (
              <p className="text-sm text-slate-600">Loading users...</p>
            ) : usersQuery.data?.length ? (
              usersQuery.data.map((user) => (
                <article
                  key={user.id}
                  className={`rounded-2xl border p-4 ${
                    editingUserId === user.id
                      ? "border-slate-300 bg-slate-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                      <p className="text-xs text-slate-500">{user.role}</p>
                      <p className="text-xs text-slate-500">
                        Saved payment:{" "}
                        {user.paymentProfile?.cardLast4
                          ? `**** ${user.paymentProfile.cardLast4}`
                          : "none"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEditingUser(user)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Edit User
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-600">No users found.</p>
            )}
          </div>

          {editingUserId ? (
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-lg font-semibold text-slate-900">Edit User Defaults</h3>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="First name"
                  value={userForm.firstName}
                  onChange={(event) =>
                    setUserForm((prev) => ({ ...prev, firstName: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={userForm.lastName}
                  onChange={(event) =>
                    setUserForm((prev) => ({ ...prev, lastName: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />
              </div>

              <input
                type="text"
                placeholder="Phone"
                value={userForm.phone}
                onChange={(event) =>
                  setUserForm((prev) => ({ ...prev, phone: event.target.value }))
                }
                className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <AddressEditor
                  title="Default Shipping Address"
                  value={userForm.shippingAddress}
                  onChange={(field, nextValue) =>
                    setUserForm((prev) => ({
                      ...prev,
                      shippingAddress: {
                        ...prev.shippingAddress,
                        [field]: nextValue
                      }
                    }))
                  }
                />
                <AddressEditor
                  title="Default Billing Address"
                  value={userForm.billingAddress}
                  onChange={(field, nextValue) =>
                    setUserForm((prev) => ({
                      ...prev,
                      billingAddress: {
                        ...prev.billingAddress,
                        [field]: nextValue
                      }
                    }))
                  }
                />
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-slate-900">Payment Profile</h4>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Saved card on file:{" "}
                  {selectedEditingUser?.paymentProfile?.cardLast4
                    ? `**** ${selectedEditingUser.paymentProfile.cardLast4}`
                    : "none"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Card updates are applied when any payment field is edited and saved.
                </p>

                <div className="mt-3 grid gap-3">
                  <input
                    type="text"
                    placeholder="Name on card"
                    value={userForm.payment.cardHolder}
                    onChange={(event) =>
                      setUserForm((prev) => ({
                        ...prev,
                        payment: { ...prev.payment, cardHolder: event.target.value }
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                  />
                  <input
                    type="text"
                    placeholder="Enter full card number to save/update"
                    value={userForm.payment.cardNumber}
                    onChange={(event) =>
                      setUserForm((prev) => ({
                        ...prev,
                        payment: { ...prev.payment, cardNumber: event.target.value }
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                  />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input
                      type="text"
                      placeholder="MM"
                      value={userForm.payment.expiryMonth}
                      onChange={(event) =>
                        setUserForm((prev) => ({
                          ...prev,
                          payment: { ...prev.payment, expiryMonth: event.target.value }
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                    />
                    <input
                      type="text"
                      placeholder="YYYY"
                      value={userForm.payment.expiryYear}
                      onChange={(event) =>
                        setUserForm((prev) => ({
                          ...prev,
                          payment: { ...prev.payment, expiryYear: event.target.value }
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                    />
                    <input
                      type="text"
                      placeholder="CVV"
                      value={userForm.payment.cvv}
                      onChange={(event) =>
                        setUserForm((prev) => ({
                          ...prev,
                          payment: { ...prev.payment, cvv: event.target.value }
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveUser}
                  disabled={updateUserMutation.isPending}
                  className="inline-flex items-center justify-center rounded-full border border-slate-900 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updateUserMutation.isPending ? "Saving..." : "Save User Updates"}
                </button>
                <button
                  type="button"
                  onClick={cancelEditingUser}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
                >
                  Cancel
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
