"use client";

import Link from "next/link";
import { useEffect } from "react";

import { useCartStore } from "@/lib/cartStore";

export function CartBadge() {
  const cartId = useCartStore((state) => state.cartId);
  const totalItems = useCartStore((state) => state.totalItems);
  const loadCart = useCartStore((state) => state.loadCart);

  useEffect(() => {
    if (cartId) {
      loadCart().catch(() => {});
    }
  }, [cartId, loadCart]);

  return (
    <Link href="/cart" className="cart-badge">
      Cart
      {totalItems > 0 && (
        <span className="cart-badge__count">{totalItems}</span>
      )}
    </Link>
  );
}
