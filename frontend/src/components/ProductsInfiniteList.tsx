"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Product } from "@/types/product";
import { ProductCard } from "@/components/ProductCard";

type ProductsInfiniteListProps = {
  initialItems: Product[];
  initialNextPage: number | null;
  pageSize: number;
  totalCount: number;
  query?: Record<string, string | undefined>;
};

const DEFAULT_ERROR_MESSAGE = "Could not load products. Please try again.";

function getApiBaseUrl(): string {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase) {
    return envBase.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8000`;
  }
  return "http://localhost:8000";
}

function extractNextPage(raw: unknown, baseUrl: string): number | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }
  try {
    const searchParams = new URL(raw, baseUrl).searchParams;
    const value = searchParams.get("page");
    return value ? Number(value) : null;
  } catch {
    return null;
  }
}

export function ProductsInfiniteList({
  initialItems,
  initialNextPage,
  pageSize,
  totalCount,
  query = {},
}: ProductsInfiniteListProps) {
  const [items, setItems] = useState<Product[]>(() => initialItems);
  const [nextPage, setNextPage] = useState<number | null>(initialNextPage);
  const [count, setCount] = useState<number>(totalCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryRef = useRef<Record<string, string | undefined>>(query);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const apiBaseUrl = useMemo(getApiBaseUrl, []);

  const hasMore = useMemo(() => nextPage !== null, [nextPage]);

  useEffect(() => {
    queryRef.current = query;
    setItems(initialItems);
    setNextPage(initialNextPage);
    setCount(totalCount);
    setError(null);
  }, [initialItems, initialNextPage, totalCount, query]);

  const loadMore = useCallback(async () => {
    const filters = queryRef.current;
    if (nextPage === null || isLoading) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const url = new URL("/api/products/", apiBaseUrl);
      url.searchParams.set("page", String(nextPage));
      url.searchParams.set("page_size", String(pageSize));
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined && value !== "") {
            url.searchParams.set(key, value);
          }
        }
      }

      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(DEFAULT_ERROR_MESSAGE);
      }
      const data = await response.json();
      const newItems: Product[] = Array.isArray(data.results) ? data.results : data;
      setItems((prev) => [...prev, ...newItems]);
      setNextPage(extractNextPage(data.next, apiBaseUrl));
      if (typeof data.count === "number") {
        setCount(data.count);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : DEFAULT_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, nextPage, pageSize, isLoading]);

  useEffect(() => {
    if (!hasMore || error) {
      return;
    }
    const target = sentinelRef.current;
    if (!target) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadMore().catch(() => {});
          }
        });
      },
      { rootMargin: "200px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [error, hasMore, loadMore]);

  const renderSkeletons = () => {
    if (!isLoading) return null;
    return Array.from({ length: 3 }).map((_, index) => (
      <div className="product-skeleton" key={`skeleton-${index}`}>
        <div className="product-skeleton__image" />
        <div className="product-skeleton__body">
          <div className="skeleton-pill" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line" style={{ width: "60%" }} />
        </div>
      </div>
    ));
  };

  if (!items.length && !isLoading) {
    return (
      <div className="catalog-empty">
        <p>No products match these filters yet.</p>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => window.location.assign("/products")}
        >
          Reset filters
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="product-grid">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
        {renderSkeletons()}
      </div>

      <div className="catalog-footer" ref={sentinelRef} />

      <div className="catalog-status">
        <p>
          Showing {items.length} of {count}
        </p>
        {error && <p className="catalog-error">{error}</p>}
        {hasMore && (
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => loadMore().catch(() => undefined)}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load more"}
          </button>
        )}
        {!hasMore && <p>You reached the end of the catalog.</p>}
      </div>
    </>
  );
}
