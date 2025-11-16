export const dynamic = "force-dynamic";

import { CatalogFilters } from "@/components/CatalogFilters";
import { ProductsInfiniteList } from "@/components/ProductsInfiniteList";
import { fetchCategories, fetchProductFacets, fetchProductsPage } from "@/lib/api";
import styles from "./products.module.css";

const PAGE_SIZE = 12;

type ProductsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeParam(value?: string | string[]): string | undefined {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value[0] ?? undefined;
  }
  return value;
}

function sanitizePrice(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return undefined;
  }
  return parsed.toString();
}

function sanitizeOrdering(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const allowed = new Set([
    "price",
    "-price",
    "name",
    "-name",
    "created_at",
    "-created_at",
    "reviews_count",
    "-reviews_count",
    "average_rating",
    "-average_rating",
  ]);
  return allowed.has(value) ? value : undefined;
}

function sanitizeSearch(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, 120);
}

function sanitizeBrand(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 80) : undefined;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = searchParams ? await searchParams : {};
  const category = normalizeParam(params.category);
  const brand = sanitizeBrand(normalizeParam(params.brand));
  const minPrice = sanitizePrice(normalizeParam(params.min_price));
  const maxPrice = sanitizePrice(normalizeParam(params.max_price));
  const rawInStock = normalizeParam(params.in_stock);
  const inStock = rawInStock === "true" || rawInStock === "1" ? "true" : undefined;
  const ordering = sanitizeOrdering(normalizeParam(params.ordering));
  const searchTerm = sanitizeSearch(normalizeParam(params.search));

  const queryParams: Record<string, string | undefined> = {
    search: searchTerm,
    category,
    brand,
    min_price: minPrice,
    max_price: maxPrice,
    in_stock: inStock,
    ordering,
  };

  const facetQuery: Record<string, string | undefined> = {
    ...queryParams,
    brand: undefined,
    ordering: undefined,
  };

  const [initialPage, categories, facets] = await Promise.all([
    fetchProductsPage({ pageSize: PAGE_SIZE, query: queryParams }),
    fetchCategories(),
    fetchProductFacets(facetQuery),
  ]);

  const filterValues = {
    search: searchTerm,
    category,
    brand,
    min_price: minPrice,
    max_price: maxPrice,
    in_stock: inStock,
    ordering,
  };

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1>Catalog</h1>
          {searchTerm ? (
            <p>
              Showing results for <strong>{searchTerm}</strong>. Adjust filters to refine the
              list.
            </p>
          ) : (
            <p>Products are synced from Django. Use search and filters to navigate quickly.</p>
          )}
          </div>
        
          <div className={styles.catalogLayout}>
            <aside className={styles.sidebar}>
              <CatalogFilters categories={categories} brands={facets.brands} initialValues={filterValues} />
            </aside>
          
          <main className={styles.content}>
            <ProductsInfiniteList
              initialItems={initialPage.items}
              initialNextPage={initialPage.nextPage}
              pageSize={PAGE_SIZE}
              totalCount={initialPage.totalCount}
              query={queryParams}
            />
          </main>
        </div>
      </div>
    </section>
  );
}
