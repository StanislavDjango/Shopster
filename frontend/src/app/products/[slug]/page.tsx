import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/AddToCartButton";
import { fetchProduct } from "@/lib/api";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";
import { ProductReviews } from "@/components/ProductReviews";

function buildImageUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) {
    return undefined;
  }
  try {
    if (imageUrl.startsWith("http")) {
      return imageUrl;
    }
    const base =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
    return new URL(imageUrl, base).toString();
  } catch {
    return undefined;
  }
}

async function loadProduct(slug: string) {
  const product = await fetchProduct(slug);
  if (!product) {
    notFound();
  }
  return product;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) {
    return {
      title: "Product not found",
      robots: { index: false, follow: false },
    };
  }

  const title = product.meta_title || product.name;
  const description =
    product.meta_description ||
    product.short_description ||
    product.description ||
    SITE_NAME;
  const canonical = absoluteUrl(`/products/${product.slug}`);
  const mainImage =
    product.images.find((image) => image.is_main) ?? product.images[0];
  const ogImage = buildImageUrl(mainImage?.image) ?? DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: SITE_NAME,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  const mainImage =
    product.images.find((img) => img.is_main) ?? product.images[0];
  const imageUrl = buildImageUrl(mainImage?.image);
  const description = product.description || product.short_description || "";

  return (
    <>
      <section className="section">
        <div className="container hero-grid">
          <div className="hero-card">
            <Link
              href="/products"
              className="btn btn-outline"
              style={{ marginBottom: "1.5rem", width: "fit-content" }}
            >
              Back to catalog
            </Link>
            <h1>{product.meta_title || product.name}</h1>
            <p className="lead">{description}</p>
            <div className="cta-buttons">
              <span className="btn price-badge">
                {formatCurrency(
                  product.currency ?? "RUB",
                  Number(product.price),
                )}
              </span>
              <AddToCartButton productId={product.id} />
              <span className="btn btn-outline">In stock: {product.stock}</span>
            </div>
            <p>SKU: {product.sku}</p>
            {product.category && <p>Category: {product.category.name}</p>}
            {product.meta_keywords && (
              <p className="product-keywords">
                Keywords: {product.meta_keywords}
              </p>
            )}
          </div>
          <div className="hero-card" style={{ padding: 0, overflow: "hidden" }}>
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={mainImage?.alt_text || product.name}
                width={960}
                height={640}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div className="product-image" />
            )}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <ProductReviews
            productId={product.id}
            productSlug={product.slug}
            averageRating={product.average_rating}
            reviewsCount={product.reviews_count}
            canReview={product.can_review}
            userReview={product.user_review}
          />
        </div>
      </section>
    </>
  );
}
