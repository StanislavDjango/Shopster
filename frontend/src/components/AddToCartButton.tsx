"use client";

import { useState } from "react";

import { useCartStore } from "@/lib/cartStore";

type Props = {
  productId: number;
  variant?: "primary" | "secondary";
};

export function AddToCartButton({ productId, variant = "primary" }: Props) {
  const addItem = useCartStore((state) => state.addItem);
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    try {
      await addItem(productId, 1);
    } finally {
      setPending(false);
    }
  };

  const className =
    variant === "primary" ? "btn btn-primary" : "btn btn-outline";

  return (
    <button className={className} onClick={handleClick} disabled={pending}>
      {pending ? "Adding..." : "Add to cart"}
    </button>
  );
}
