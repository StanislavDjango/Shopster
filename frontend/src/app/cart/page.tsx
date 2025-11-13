"use client";

import Link from "next/link";
import { useEffect } from "react";

import { useCartStore } from "@/lib/cartStore";
import { formatCurrency } from "@/lib/utils";

export default function CartPage() {
  const {
    items,
    subtotal,
    totalItems,
    loadCart,
    updateItem,
    removeItem,
    isLoading,
  } = useCartStore((state) => ({
    items: state.items,
    subtotal: state.subtotal,
    totalItems: state.totalItems,
    loadCart: state.loadCart,
    updateItem: state.updateItem,
    removeItem: state.removeItem,
    isLoading: state.isLoading,
  }));

  useEffect(() => {
    loadCart().catch(() => {});
  }, [loadCart]);

  if (isLoading && items.length === 0) {
    return (
      <section className="section">
        <div className="container cart-container">
          <h1>Cart</h1>
          <p>Loading your cart...</p>
        </div>
      </section>
    );
  }

  if (!totalItems) {
    return (
      <section className="section">
        <div className="container cart-container">
          <h1>Your cart is empty</h1>
          <p>Add products from the catalog to place an order.</p>
          <Link className="btn btn-primary" href="/products">
            Browse catalog
          </Link>
        </div>
      </section>
    );
  }

  const currency = items[0]?.product.currency ?? "RUB";

  return (
    <section className="section">
      <div className="container cart-container">
        <h1>Cart</h1>
        <div className="cart-grid">
          <div className="cart-items">
            {items.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item__info">
                  <div className="cart-item__header">
                    <h3>{item.product.name}</h3>
                    <button
                      className="cart-item__remove"
                      onClick={async () => {
                        try {
                          await removeItem(item.id);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <p>{item.product.short_description}</p>
                  <div className="cart-item__actions">
                    <label>
                      Quantity
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={async (event) => {
                          const value = Number(event.target.value);
                          const qty =
                            Number.isFinite(value) && value > 0
                              ? Math.floor(value)
                              : 1;
                          try {
                            await updateItem(item.id, qty);
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                      />
                    </label>
                    <span className="cart-item__price">
                      {formatCurrency(currency, item.subtotal)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <aside className="cart-summary">
            <h2>Summary</h2>
            <div className="cart-summary__row">
              <span>Items ({totalItems})</span>
              <span>{formatCurrency(currency, subtotal)}</span>
            </div>
            <Link className="btn btn-primary auth-submit" href="/checkout">
              Proceed to checkout
            </Link>
            <Link className="cart-summary__link" href="/products">
              Continue shopping
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
