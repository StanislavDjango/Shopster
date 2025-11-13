import { fetchProducts } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import Link from "next/link";
import { BACKEND_ORIGIN } from "@/lib/config";

export const revalidate = 60;

const FEATURED_PRODUCT_LIMIT = 6;

const FEATURE_CARDS = [
  {
    title: "Catalog & orders",
    description:
      "Manage products, categories, carts and orders from the Django admin or via API endpoints.",
  },
  {
    title: "Algolia search",
    description:
      "Instant search with facets, typo tolerance and configurable ranking.",
  },
  {
    title: "Next.js storefront",
    description:
      "Modern UX with server components, ready for static generation or server rendering.",
  },
];

export default async function HomePage() {
  let products = [] as Awaited<ReturnType<typeof fetchProducts>>;

  try {
    products = await fetchProducts(FEATURED_PRODUCT_LIMIT);
  } catch (error) {
    console.error("Failed to fetch featured products:", error);
  }

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-card">
            <span className="highlight">New headless storefront</span>
            <h1>
              Launch a modern commerce stack with Next.js and Algolia search
            </h1>
            <p className="lead">
              The catalog is powered by Django REST API, the search is backed by
              Algolia. Extend the platform with payments, analytics, and custom
              experiences when you are ready.
            </p>
            <div className="cta-buttons">
              <Link className="btn btn-primary" href="/products">
                Explore catalog
              </Link>
              <a
                className="btn btn-outline"
                href={`${BACKEND_ORIGIN}/admin/`}
                target="_blank"
                rel="noreferrer noopener"
              >
                Manage products
              </a>
            </div>
          </div>
          <div className="highlight-grid">
            <div className="highlight">
              Automatic sync from Django to Algolia
            </div>
            <div className="highlight">
              Instant results with category facets and relevance tuning
            </div>
            <div className="highlight">Ready for SSR/ISR and static export</div>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="container">
          <div className="section-header">
            <h2>What is included</h2>
            <p>
              Django API, Algolia indexing pipeline, Next.js frontend and
              Dockerised infrastructure.
            </p>
          </div>
          <div className="feature-grid">
            {FEATURE_CARDS.map(({ title, description }) => (
              <div className="feature-card" key={title}>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Featured products</h2>
            <p>
              Data comes straight from the Django API. Adjust the selection to
              match your merchandising strategy.
            </p>
          </div>
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
