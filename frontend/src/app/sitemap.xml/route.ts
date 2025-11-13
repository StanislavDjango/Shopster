import { NextResponse } from "next/server";

import { SITE_URL, absoluteUrl } from "@/lib/seo";

const API_BASE =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

type ApiListResponse<T> = {
  results?: T[];
  next?: string | null;
};

async function fetchAll<T>(endpoint: string): Promise<T[]> {
  const items: T[] = [];
  let nextUrl: string | null = `${API_BASE}${endpoint}`;

  while (nextUrl) {
    try {
      const response = await fetch(nextUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        break;
      }

      const data = (await response.json()) as ApiListResponse<T> | T[];
      if (Array.isArray(data)) {
        items.push(...data);
        break;
      }

      if (Array.isArray(data.results)) {
        items.push(...data.results);
      }
      nextUrl = data.next ?? null;
    } catch {
      break;
    }
  }

  return items;
}

export async function GET() {
  const urls: Array<{ loc: string; lastmod?: string }> = [
    { loc: absoluteUrl("/") },
    { loc: absoluteUrl("/products") },
    { loc: absoluteUrl("/signin") },
    { loc: absoluteUrl("/signup") },
    { loc: absoluteUrl("/forgot-password") },
  ];

  const products = await fetchAll<{
    slug?: string;
    updated_at?: string;
    modified?: string;
  }>("/api/products/?page_size=100");

  const now = new Date().toISOString();
  for (const product of products) {
    if (!product?.slug) {
      continue;
    }
    urls.push({
      loc: absoluteUrl(`/products/${product.slug}`),
      lastmod: product.updated_at ?? product.modified ?? now,
    });
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (entry) =>
        `<url><loc>${entry.loc}</loc>${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ""}</url>`,
    ),
    "</urlset>",
  ].join("");

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
