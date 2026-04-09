"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { isAxiosError } from "axios";
import { api, toErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Item } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ApiMeRoleResponse = {
  user?: {
    role?: "CUSTOMER" | "ADMIN";
  };
};

export default function CatalogPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const queryString = searchParams.toString();

  useEffect(() => {
    if (queryString.length === 0) {
      return;
    }

    const params = new URLSearchParams(queryString);
    const searchFromUrl = params.get("search")?.trim() ?? "";
    const categoryFromUrl = params.get("category")?.trim() ?? "";
    const brandFromUrl = params.get("brand")?.trim() ?? "";
    const modelFromUrl = params.get("model")?.trim() ?? "";
    const sortByFromUrl = params.get("sortBy");
    const sortOrderFromUrl = params.get("sortOrder");
    const nextSortBy: "name" | "price" = sortByFromUrl === "price" ? "price" : "name";
    const nextSortOrder: "asc" | "desc" = sortOrderFromUrl === "desc" ? "desc" : "asc";

    setSearch(searchFromUrl);
    setCategory(categoryFromUrl);
    setBrand(brandFromUrl);
    setModel(modelFromUrl);
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);

    router.replace("/catalog", { scroll: false });
  }, [queryString, router]);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      category: category || undefined,
      brand: brand || undefined,
      model: model || undefined,
      sortBy,
      sortOrder,
    }),
    [search, category, brand, model, sortBy, sortOrder]
  );

  const filterOptionsQuery = useQuery({
    queryKey: ["catalog-filter-options"],
    queryFn: async () => {
      const { data } = await api.get("/catalog/items");
      return data.items as Item[];
    },
  });

  const catalogQuery = useQuery({
    queryKey: ["catalog", filters],
    queryFn: async () => {
      const { data } = await api.get("/catalog/items", { params: filters });
      return data.items as Item[];
    },
  });

  const meRoleQuery = useQuery({
    queryKey: ["me-role"],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiMeRoleResponse>("/identity/me");
        return data.user?.role ?? null;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) {
          return null;
        }

        return null;
      }
    },
    retry: false,
  });

  const addMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.post("/cart/items", { itemId, quantity: 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const allItems = filterOptionsQuery.data ?? [];
  const categoryOptions = useMemo(
    () =>
      [...new Set(allItems.map((item) => item.category))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [allItems]
  );

  const brandOptions = useMemo(
    () =>
      [
        ...new Set(
          allItems
            .filter((item) => (category ? item.category === category : true))
            .map((item) => item.brand)
        ),
      ]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [allItems, category]
  );

  const modelOptions = useMemo(
    () =>
      [
        ...new Set(
          allItems
            .filter((item) => (category ? item.category === category : true))
            .filter((item) => (brand ? item.brand === brand : true))
            .map((item) => item.model)
        ),
      ]
        .filter((value): value is string => Boolean(value && value.trim()))
        .sort((a, b) => a.localeCompare(b)),
    [allItems, category, brand]
  );

  useEffect(() => {
    if (brand && !brandOptions.includes(brand)) {
      setBrand("");
      setModel("");
    }
  }, [brand, brandOptions]);

  useEffect(() => {
    if (model && !modelOptions.includes(model)) {
      setModel("");
    }
  }, [model, modelOptions]);

  const items = catalogQuery.data ?? [];
  const filtersLoading = filterOptionsQuery.isLoading;
  const isAdmin = meRoleQuery.data === "ADMIN";

  return (
    <main className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Shop Catalog
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Browse Computer Accessories
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Search products, filter by category or brand, sort by name or
              price, and add items directly to your cart.
            </p>
          </div>

          <Link
            href="/cart"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Go to Cart
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
          <div className="xl:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Search
            </label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items"
              className="h-10 rounded-2xl border-slate-300 bg-white/95 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_12px_rgba(15,23,42,0.06)] focus:border-slate-500 focus:ring-slate-300/40"
            />
          </div>

          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500 disabled:bg-slate-100"
              disabled={filtersLoading}
            >
              <option value="">All categories</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Brand
            </label>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500 disabled:bg-slate-100"
              disabled={filtersLoading}
            >
              <option value="">All brands</option>
              {brandOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500 disabled:bg-slate-100"
              disabled={filtersLoading}
            >
              <option value="">All models</option>
              {modelOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="xl:col-span-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Sort
            </label>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "name" | "price")}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-700 outline-none transition focus:border-slate-500"
              >
                <option value="name">Name</option>
                <option value="price">Price</option>
              </select>

              <select
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(e.target.value as "asc" | "desc")
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-700 outline-none transition focus:border-slate-500"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {catalogQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(catalogQuery.error)}
        </div>
      ) : null}

      {filterOptionsQuery.error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {toErrorMessage(filterOptionsQuery.error)}
        </div>
      ) : null}

      {addMutation.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {toErrorMessage(addMutation.error)}
        </div>
      ) : null}

      {catalogQuery.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-600 shadow-sm">
          Loading catalog...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-600 shadow-sm">
          No products matched your filters.
        </div>
      ) : (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-56 items-center justify-center bg-slate-100">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-sm font-medium text-slate-500">
                    No image
                  </div>
                )}
              </div>

              <div className="flex h-full flex-col gap-4 p-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {item.category}
                    </span>
                    {item.quantity > 0 && item.quantity <= 5 ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                        Almost gone
                      </span>
                    ) : null}
                    {item.quantity === 0 ? (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                        Out of stock
                      </span>
                    ) : null}
                  </div>

                  <h2 className="text-2xl font-semibold text-slate-900">
                    {item.name}
                  </h2>

                  <p
                    className={`text-sm leading-6 text-slate-600 ${
                      isAdmin ? "line-clamp-2" : "line-clamp-3"
                    }`}
                  >
                    {item.description}
                  </p>
                </div>

                <div className="mt-auto space-y-4">
                  <div className="grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-900">
                        Brand:
                      </span>{" "}
                      {item.brand}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">
                        Model:
                      </span>{" "}
                      {item.model ?? "N/A"}
                    </p>
                    {isAdmin ? (
                      <p>
                        <span className="font-semibold text-slate-900">
                          Inventory:
                        </span>{" "}
                        {item.quantity}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <p className="whitespace-nowrap text-2xl font-bold text-slate-900">
                      {formatCurrency(item.price)}
                    </p>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/catalog/${item.id}`}
                        className="inline-flex min-w-0 flex-1 whitespace-nowrap items-center justify-center rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        View details
                      </Link>

                      <Button
                        onClick={() => addMutation.mutate(item.id)}
                        disabled={addMutation.isPending || item.quantity === 0}
                        className="min-w-0 flex-1 whitespace-nowrap rounded-full border-slate-900 bg-gradient-to-r from-slate-900 to-slate-700 px-3 text-white shadow-sm transition hover:from-slate-800 hover:to-slate-700 disabled:hover:from-slate-900 disabled:hover:to-slate-700"
                      >
                        {item.quantity === 0 ? "Out of stock" : "Add to cart"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
