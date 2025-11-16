"use client";

import Image from "next/image";
import Link from "next/link";

import { AddToCartButton } from "@/components/AddToCartButton";
import { formatCurrency } from "@/lib/utils";
import { Product } from "@/types/product";

type Props = {
  product: Product;
};

export function ProductCard({ product }: Props) {
  const mainImage = product.images.find((img) => img.is_main) ?? product.images[0];
  const isInStock = product.stock > 0;
  const ratingText =
    typeof product.average_rating === "number"
      ? `${product.average_rating.toFixed(1)} stars (${product.reviews_count} review${
          product.reviews_count === 1 ? "" : "s"
        })`
      : "No reviews yet";

  return (
    <div className="product-card">
      {mainImage ? (
        <Image
          className="product-image"
          src={new URL(
            mainImage.image,
            process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
          ).toString()}
          alt={mainImage.alt_text || product.name}
          width={640}
          height={420}
        />
      ) : (
        <div className="product-image" />
      )}
      <div className="product-body">
        <div className="product-header">
          <span className="product-price">
            {formatCurrency(product.currency ?? "RUB", Number(product.price))}
          </span>
          <span className={`product-stock ${isInStock ? "positive" : "muted"}`}>
            {isInStock ? "In stock" : "Out of stock"}
          </span>
        </div>
        <h3 className="product-title">
          {product.brand ? `${product.brand} - ` : ""}
          {product.name}
        </h3>
        <p className="product-description">{product.short_description}</p>
        <div className="product-meta">
          <span className="product-rating" aria-label="Average rating">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M12 17.3 6.18 21l1.56-6.7L2 9.27l6.9-.59L12 2l3.1 6.68 6.9.59-5.74 5.03L17.82 21z" />
            </svg>
            {ratingText}
          </span>
          {product.category?.name && (
            <span className="product-category">{product.category.name}</span>
          )}
        </div>
        <div className="product-actions">
          <Link href={`/products/${product.slug}`} className="btn btn-outline">
            View details
          </Link>
          <AddToCartButton productId={product.id} />
        </div>
      </div>
    </div>
  );
}
