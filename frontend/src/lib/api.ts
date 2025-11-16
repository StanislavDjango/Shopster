import "server-only";

import { Product, CategorySummary } from "@/types/product";
import { PostSummary, PostDetail } from "@/types/post";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

export type ProductFacets = {
  brands: Array<{ name: string; count: number }>;
  price?: {
    min: number | null;
    max: number | null;
  };
};

type PaginationParams = {
  page?: number;
  pageSize?: number;
  query?: Record<string, string | undefined>;
};

export type PaginatedResult<T> = {
  items: T[];
  nextPage: number | null;
  previousPage: number | null;
  totalCount: number;
};

function parsePageNumber(value: unknown): number | null {
  if (!value || typeof value !== "string") {
    return null;
  }
  try {
    const pageParam = new URL(value, API_BASE).searchParams.get("page");
    return pageParam ? Number(pageParam) : null;
  } catch {
    return null;
  }
}

async function fetchPaginatedCollection<T>(
  endpoint: string,
  params: PaginationParams = {},
): Promise<PaginatedResult<T>> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 12;
  const url = new URL(endpoint, API_BASE);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(pageSize));

  if (params.query) {
    for (const [key, value] of Object.entries(params.query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  const shouldBypassCache =
    params.query &&
    Object.values(params.query).some((value) => value !== undefined && value !== "");
  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    ...(shouldBypassCache ? { cache: "no-store" as const } : { next: { revalidate: 60 } }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`);
  }

  const data = await response.json();
  const items: T[] = Array.isArray(data.results) ? data.results : data;

  return {
    items,
    nextPage: parsePageNumber(data.next),
    previousPage: parsePageNumber(data.previous),
    totalCount: typeof data.count === "number" ? data.count : items.length,
  };
}

type FetchProductsPageOptions = PaginationParams;

export async function fetchProductsPage(
  options: FetchProductsPageOptions = {},
): Promise<PaginatedResult<Product>> {
  try {
    return await fetchPaginatedCollection<Product>("/api/products/", options);
  } catch (error) {
    console.error("Failed to fetch products page", error);
    return { items: [], nextPage: null, previousPage: null, totalCount: 0 };
  }
}

export async function fetchProducts(limit = 6): Promise<Product[]> {
  const page = await fetchProductsPage({ pageSize: limit });
  return page.items;
}

export async function fetchProduct(slug: string): Promise<Product | null> {
  const url = new URL(`/api/products/${slug}/`, API_BASE);
  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data as Product;
}

export async function fetchProductFacets(
  query: Record<string, string | undefined> = {},
): Promise<ProductFacets> {
  try {
    const url = new URL("/api/products/facets/", API_BASE);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 120 },
    });
    if (!response.ok) {
      console.warn("Facets endpoint unavailable", response.status, response.statusText);
      return { brands: [] };
    }
    const data = await response.json();
    return {
      brands: Array.isArray(data.brands) ? data.brands.filter((b) => b?.name) : [],
      price: data.price,
    };
  } catch (error) {
    console.warn("Failed to fetch product facets", error);
    return { brands: [] };
  }
}

export async function fetchCategories(): Promise<CategorySummary[]> {
  const url = new URL("/api/categories/", API_BASE);
  url.searchParams.set("page_size", "100");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    console.error("Failed to fetch categories", response.status, response.statusText);
    return [];
  }

  const data = await response.json();
  const payload = Array.isArray(data.results) ? data.results : data;
  return payload
    .filter((category: any) => category && category.slug && category.is_active !== false)
    .map((category: any) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      meta_title: category.meta_title ?? category.name,
      meta_description: category.meta_description ?? category.description ?? "",
    }));
}

export async function fetchPosts(
  options: PaginationParams = {},
): Promise<PaginatedResult<PostSummary>> {
  return fetchPaginatedCollection<PostSummary>("/api/content/posts/", options);
}

export async function fetchPost(slug: string): Promise<PostDetail | null> {
  const url = new URL(`/api/content/posts/${slug}/`, API_BASE);
  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data as PostDetail;
}
