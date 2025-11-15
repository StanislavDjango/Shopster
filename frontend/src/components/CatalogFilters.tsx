"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CategorySummary } from "@/types/product";
import styles from "./CatalogFilters.module.css";

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

export function CatalogFilters({ categories, initialValues }: CatalogFiltersProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
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
    <>
      <button className={styles.mobileFilterToggle} onClick={() => setIsOpen(!isOpen)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
        <span>Filters</span>
      </button>
      <form className={`${styles.catalogFilters} ${isOpen ? styles.open : ""}`} onSubmit={handleSubmit}>
        <div className={styles.filterHeader}>
          <h3 className={styles.filterTitle}>Filters</h3>
          <button 
            type="button"
            className={styles.closeButton}
            onClick={() => setIsOpen(false)}
            aria-label="Close filters"
          >
            ✕
          </button>
        </div>

        <div className={styles.filterSection}>
          <label className={styles.searchLabel}>
            <span className={styles.labelText}>Search</span>
            <div className={styles.searchWrapper}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="search"
                name="search"
                placeholder="Search products"
                defaultValue={initialValues.search ?? ""}
                className={styles.input}
              />
            </div>
          </label>
        </div>

        <div className={styles.filterSection}>
          <label className={styles.filterLabel}>
            <span className={styles.labelText}>Category</span>
            <select name="category" defaultValue={initialValues.category ?? ""} className={styles.select}>
              <option value="">All categories</option>
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.filterSection}>
          <label className={styles.filterLabel}>
            <span className={styles.labelText}>Sort by</span>
            <select name="ordering" defaultValue={initialValues.ordering ?? ""} className={styles.select}>
              {ORDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.filterSection}>
          <h4 className={styles.filterSubtitle}>Price Range</h4>
          <div className={styles.priceInputs}>
            <label className={styles.priceLabel}>
              <span className={styles.priceText}>From</span>
              <input
                type="number"
                name="min_price"
                min={0}
                step="0.01"
                placeholder="0"
                defaultValue={initialValues.min_price ?? ""}
                className={styles.priceInput}
              />
            </label>
            <label className={styles.priceLabel}>
              <span className={styles.priceText}>To</span>
              <input
                type="number"
                name="max_price"
                min={0}
                step="0.01"
                placeholder="0"
                defaultValue={initialValues.max_price ?? ""}
                className={styles.priceInput}
              />
            </label>
          </div>
        </div>

        <div className={styles.filterSection}>
          <label className={styles.checkboxLabel}>
            <input 
              type="checkbox" 
              name="in_stock" 
              defaultChecked={initialValues.in_stock === "true"}
              className={styles.checkbox}
            />
            <span className={styles.checkboxText}>In stock only</span>
          </label>
        </div>

        <div className={styles.filterActions}>
          <button type="submit" className={styles.applyButton}>
            Apply Filters
          </button>
          <button type="button" className={styles.resetButton} onClick={handleReset}>
            Clear All
          </button>
        </div>
      </form>
    </>
  );
}
