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

const emptyInventoryForm = {
  sku: "",
  name: "",
  description: "",
  category: "",
  brand: "",
  model: "",
  imageUrl: "",
  quantity: "",
  price: "",
};

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
    price: String(item.price),
  };
}

export default function AdminPage() {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    customerEmail: "",
    itemName: "",
    dateFrom: "",
    dateTo: "",
  });
  const [newItemForm, setNewItemForm] = useState(emptyInventoryForm);
  const [newItemFormError, setNewItemFormError] = useState<string | null>(null);
  const [newItemFormSuccess, setNewItemFormSuccess] = useState<string | null>(
    null
  );
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemForm, setEditItemForm] = useState(emptyInventoryForm);
  const [editItemFormError, setEditItemFormError] = useState<string | null>(null);
  const [inventoryActionSuccess, setInventoryActionSuccess] = useState<string | null>(
    null
  );

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
    },
  });

  const editInventoryMutation = useMutation({
    mutationFn: async ({
      itemId,
      payload,
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
    },
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
    },
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
      price,
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
        price,
      },
    });
  };

  const handleDeleteInventoryItem = (item: AdminProduct) => {
    const confirmed = window.confirm(
      `Delete "${item.name}" (${item.sku}) from inventory? This action cannot be undone.`
    );
    if (!confirmed) return;

    setInventoryActionSuccess(null);
    setNewItemFormSuccess(null);
    setEditItemFormError(null);
    deleteInventoryMutation.mutate(item.id);
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

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-lg font-semibold text-slate-900">Add New Product</h3>
            <form
              className="mt-4 grid gap-3 md:grid-cols-2"
              onSubmit={handleCreateInventoryItem}
            >
              <input
                type="text"
                placeholder="SKU *"
                value={newItemForm.sku}
                onChange={(e) =>
                  setNewItemForm((prev) => ({ ...prev, sku: e.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="text"
                placeholder="Product name *"
                value={newItemForm.name}
                onChange={(e) =>
                  setNewItemForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="text"
                placeholder="Category *"
                value={newItemForm.category}
                onChange={(e) =>
                  setNewItemForm((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="text"
                placeholder="Brand *"
                value={newItemForm.brand}
                onChange={(e) =>
                  setNewItemForm((prev) => ({ ...prev, brand: e.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="text"
                placeholder="Model (optional)"
                value={newItemForm.model}
                onChange={(e) =>
                  setNewItemForm((prev) => ({ ...prev, model: e.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="url"
                placeholder="Image URL (optional)"
                value={newItemForm.imageUrl}
                onChange={(e) =>
                  setNewItemForm((prev) => ({
                    ...prev,
                    imageUrl: e.target.value,
                  }))
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="number"
                min={0}
                step={1}
                placeholder="Quantity *"
                value={newItemForm.quantity}
                onChange={(e) =>
                  setNewItemForm((prev) => ({
                    ...prev,
                    quantity: e.target.value,
                  }))
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="number"
                min={1}
                step={1}
                placeholder="Price CAD *"
                value={newItemForm.price}
                onChange={(e) =>
                  setNewItemForm((prev) => ({ ...prev, price: e.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
              />
              <textarea
                placeholder="Description *"
                value={newItemForm.description}
                onChange={(e) =>
                  setNewItemForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
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
                  {createInventoryMutation.isPending
                    ? "Adding product..."
                    : "Add Product"}
                </button>
              </div>
            </form>
            {newItemFormError ? (
              <p className="mt-3 text-sm text-red-700">{newItemFormError}</p>
            ) : null}
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
                      <h3 className="text-lg font-semibold text-slate-900">
                        {item.name}
                      </h3>
                      <p className="text-sm text-slate-600">SKU: {item.sku}</p>
                      <p className="text-sm text-slate-600">
                        {item.brand} · {item.category}
                      </p>
                      <p className="text-sm text-slate-600">
                        Price: {formatCurrency(item.price)}
                      </p>
                      <p className="text-sm text-slate-600">
                        Quantity in stock: {item.quantity}
                      </p>
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
                        onChange={(e) =>
                          setEditItemForm((prev) => ({ ...prev, sku: e.target.value }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                      />
                      <input
                        type="text"
                        placeholder="Product name *"
                        value={editItemForm.name}
                        onChange={(e) =>
                          setEditItemForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                      />
                      <input
                        type="text"
                        placeholder="Category *"
                        value={editItemForm.category}
                        onChange={(e) =>
                          setEditItemForm((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                      />
                      <input
                        type="text"
                        placeholder="Brand *"
                        value={editItemForm.brand}
                        onChange={(e) =>
                          setEditItemForm((prev) => ({ ...prev, brand: e.target.value }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                      />
                      <input
                        type="text"
                        placeholder="Model (optional)"
                        value={editItemForm.model}
                        onChange={(e) =>
                          setEditItemForm((prev) => ({ ...prev, model: e.target.value }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                      />
                      <input
                        type="url"
                        placeholder="Image URL (optional)"
                        value={editItemForm.imageUrl}
                        onChange={(e) =>
                          setEditItemForm((prev) => ({
                            ...prev,
                            imageUrl: e.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                      />
                      <input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="Quantity *"
                        value={editItemForm.quantity}
                        onChange={(e) =>
                          setEditItemForm((prev) => ({
                            ...prev,
                            quantity: e.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                      />
                      <input
                        type="number"
                        min={1}
                        step={1}
                        placeholder="Price CAD *"
                        value={editItemForm.price}
                        onChange={(e) =>
                          setEditItemForm((prev) => ({ ...prev, price: e.target.value }))
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                      />
                      <textarea
                        placeholder="Description *"
                        value={editItemForm.description}
                        onChange={(e) =>
                          setEditItemForm((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
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
                          {editInventoryMutation.isPending
                            ? "Saving..."
                            : "Save Changes"}
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
