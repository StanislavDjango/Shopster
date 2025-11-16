import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/AddToCartButton";
import { fetchProduct } from "@/lib/api";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";
import { ProductReviews } from "@/components/ProductReviews";
import styles from "./product-detail.module.css";

function buildImageUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) {
    return undefined;
  }
  try {
    if (imageUrl.startsWith("http")) {
      return imageUrl;
    }
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
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
    product.meta_description || product.short_description || product.description || SITE_NAME;
  const canonical = absoluteUrl(`/products/${product.slug}`);
  const mainImage = product.images.find((image) => image.is_main) ?? product.images[0];
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

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  const mainImage = product.images.find((img) => img.is_main) ?? product.images[0];
  const imageUrl = buildImageUrl(mainImage?.image);
  const description = product.description || product.short_description || "";
  const isInStock = product.stock > 0;

  return (
    <>
      <section className={styles.productDetailSection}>
        <div className={styles.productContainer}>
          <div className={styles.productGrid}>
            {/* Product Info */}
            <div className={styles.productInfo}>
              <Link href="/products" className={styles.backButton}>
                ← Back to catalog
              </Link>

              <h1 className={styles.productTitle}>{product.meta_title || product.name}</h1>

              <p className={styles.productDescription}>{description}</p>

              {/* Price Section */}
              <div className={styles.priceSection}>
                <span className={styles.price}>
                  {formatCurrency(product.currency ?? "RUB", Number(product.price))}
                </span>
                <span className={`${styles.stock} ${!isInStock ? styles.outOfStock : ""}`}>
                  {isInStock ? `✓ In stock: ${product.stock}` : "Out of stock"}
                </span>
              </div>

              {/* Action Buttons */}
              <div className={styles.productActions}>
                <AddToCartButton productId={product.id} />
              </div>

              {/* Product Meta Information */}
              <div className={styles.productMeta}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>SKU</span>
                  <span className={styles.metaValue}>{product.sku}</span>
                </div>
                {product.category && (
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Category</span>
                    <span className={styles.metaValue}>{product.category.name}</span>
                  </div>
                )}
                {product.average_rating && (
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Rating</span>
                    <span className={styles.metaValue}>
                      ⭐ {product.average_rating.toFixed(1)} ({product.reviews_count} reviews)
                    </span>
                  </div>
                )}
                {product.meta_keywords && (
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Keywords</span>
                    <span className={styles.metaValue}>{product.meta_keywords}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Product Image */}
            <div className={styles.productImageContainer}>
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={mainImage?.alt_text || product.name}
                  width={960}
                  height={640}
                  className={styles.productImage}
                />
              ) : (
                <div className={styles.productImagePlaceholder}>No image available</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className={styles.reviewsSection}>
        <div className={styles.productContainer}>
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
