"use client";

import { ProductReview } from "@/types/product";

type ReviewsResponse = {
  results: ProductReview[];
  next: string | null;
  previous: string | null;
  count: number;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function parseNextPage(next: string | null): number | null {
  if (!next) {
    return null;
  }
  try {
    const pageParam = new URL(next, API_BASE).searchParams.get("page");
    return pageParam ? Number(pageParam) : null;
  } catch {
    return null;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data === "object" && data && "detail" in data
        ? (data as { detail: string }).detail
        : response.statusText;
    throw new Error(message || "Request failed");
  }
  return data as T;
}

export async function fetchProductReviews(
  productSlug: string,
  page = 1,
): Promise<{
  reviews: ProductReview[];
  nextPage: number | null;
  totalCount: number;
}> {
  const url = new URL("/api/reviews/", API_BASE);
  url.searchParams.set("page", String(page));
  url.searchParams.set("product_slug", productSlug);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    credentials: "include",
    cache: "no-store",
  });
  const data = await handleResponse<ReviewsResponse>(response);
  return {
    reviews: data.results,
    nextPage: parseNextPage(data.next),
    totalCount: data.count ?? data.results.length,
  };
}

type ReviewPayload = {
  product_id: number;
  rating: number;
  title?: string;
  body: string;
  author_name?: string;
};

export async function createProductReview(
  payload: ReviewPayload,
  accessToken?: string,
): Promise<ProductReview> {
  const url = new URL("/api/reviews/", API_BASE);
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse<ProductReview>(response);
}

export async function updateProductReview(
  reviewId: number,
  payload: Partial<Omit<ReviewPayload, "product_id">>,
  accessToken?: string,
): Promise<ProductReview> {
  const url = new URL(`/api/reviews/${reviewId}/`, API_BASE);
  const response = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse<ProductReview>(response);
}

export async function deleteProductReview(
  reviewId: number,
  accessToken?: string,
): Promise<void> {
  const url = new URL(`/api/reviews/${reviewId}/`, API_BASE);
  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    credentials: "include",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      body?.detail || response.statusText || "Failed to delete review.";
    throw new Error(message);
  }
}
