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
  const mainImage =
    product.images.find((img) => img.is_main) ?? product.images[0];

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
        <span className="product-price">
          {formatCurrency(product.currency ?? "RUB", Number(product.price))}
        </span>
        <h3>{product.name}</h3>
        <p>{product.short_description}</p>
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
