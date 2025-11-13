"use client";

import { FormEvent, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

import { CategorySummary } from "@/types/product";

const ORDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Featured" },
  { value: "price", label: "Price: Low to high" },
  { value: "-price", label: "Price: High to low" },
  { value: "-created_at", label: "Newest" },
  { value: "name", label: "Name A-Z" },
  { value: "-name", label: "Name Z-A" },
];

export type CatalogFilterValues = {
  search?: string;
  category?: string;
  min_price?: string;
  max_price?: string;
  in_stock?: string;
  ordering?: string;
};

type CatalogFiltersProps = {
  categories: CategorySummary[];
  initialValues: CatalogFilterValues;
};

function buildQueryString(values: CatalogFilterValues) {
  const params = new URLSearchParams();
  if (values.search) params.set("search", values.search);
  if (values.category) params.set("category", values.category);
  if (values.min_price) params.set("min_price", values.min_price);
  if (values.max_price) params.set("max_price", values.max_price);
  if (values.in_stock === "true") params.set("in_stock", "true");
  if (values.ordering) params.set("ordering", values.ordering);
  return params.toString();
}

export function CatalogFilters({
  categories,
  initialValues,
}: CatalogFiltersProps) {
  const router = useRouter();
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );
  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const rawSearch = (formData.get("search") as string) ?? "";
      const nextValues: CatalogFilterValues = {
        search: rawSearch.trim() || undefined,
        category: (formData.get("category") as string) || undefined,
        min_price: (formData.get("min_price") as string) || undefined,
        max_price: (formData.get("max_price") as string) || undefined,
        in_stock: formData.get("in_stock") ? "true" : undefined,
        ordering: (formData.get("ordering") as string) || undefined,
      };
      const queryString = buildQueryString(nextValues);
      const url = queryString ? `/products?${queryString}` : "/products";
      router.push(url);
    },
    [router],
  );

  const handleReset = useCallback(() => {
    router.push("/products");
  }, [router]);
  return (
    <form className="catalog-filters" onSubmit={handleSubmit}>
      <label className="catalog-filters__search">
        <span>Search</span>
        <input
          type="search"
          name="search"
          placeholder="Search products"
          defaultValue={initialValues.search ?? ""}
        />
      </label>
      <label>
        <span>Category</span>
        <select name="category" defaultValue={initialValues.category ?? ""}>
          <option value="">All categories</option>
          {sortedCategories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Price from</span>
        <input
          type="number"
          name="min_price"
          min={0}
          step="0.01"
          defaultValue={initialValues.min_price ?? ""}
        />
      </label>
      <label>
        <span>Price to</span>
        <input
          type="number"
          name="max_price"
          min={0}
          step="0.01"
          defaultValue={initialValues.max_price ?? ""}
        />
      </label>
      <label className="catalog-filters__checkbox">
        <input
          type="checkbox"
          name="in_stock"
          defaultChecked={initialValues.in_stock === "true"}
        />
        <span>In stock</span>
      </label>
      <label>
        <span>Sort by</span>
        <select name="ordering" defaultValue={initialValues.ordering ?? ""}>
          {ORDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="catalog-filters__actions">
        <button type="submit" className="btn btn-primary">
          Apply
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleReset}
        >
          Reset
        </button>
      </div>
    </form>
  );
}
