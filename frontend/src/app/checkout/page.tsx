"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useTransition } from "react";

import { useCartStore, type CheckoutPayload } from "@/lib/cartStore";
import { formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";

export default function CheckoutPage() {
  const session = useSession();
  const router = useRouter();

  const { items, subtotal, totalItems, loadCart, checkout } = useCartStore(
    (state) => ({
      items: state.items,
      subtotal: state.subtotal,
      totalItems: state.totalItems,
      loadCart: state.loadCart,
      checkout: state.checkout,
    }),
  );

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadCart().catch(() => {});
  }, [loadCart]);

  if (!totalItems) {
    return (
      <section className="section">
        <div className="container auth-card">
          <h1>Cart is empty</h1>
          <p className="auth-subtitle">
            Add products before proceeding to checkout.
          </p>
          <Link className="btn btn-primary auth-submit" href="/products">
            Back to catalog
          </Link>
        </div>
      </section>
    );
  }

  const defaultEmail = session.data?.user?.email ?? "";
  const defaultName = [
    session.data?.user?.first_name,
    session.data?.user?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const optional = (value: FormDataEntryValue | null) => {
      const str = String(value ?? "").trim();
      return str.length ? str : undefined;
    };

    const orderPayload: CheckoutPayload = {
      customer_email: String(formData.get("customer_email") || "").trim(),
      customer_phone: optional(formData.get("customer_phone")),
      shipping_full_name: String(
        formData.get("shipping_full_name") || "",
      ).trim(),
      shipping_address: String(formData.get("shipping_address") || "").trim(),
      shipping_city: String(formData.get("shipping_city") || "").trim(),
      shipping_postcode: optional(formData.get("shipping_postcode")),
      shipping_country: optional(formData.get("shipping_country")) ?? "Russia",
      notes: optional(formData.get("notes")),
    };

    if (!orderPayload.customer_email) {
      setError("Email is required.");
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        const order = await checkout(orderPayload);
        const params = new URLSearchParams({ order: String(order.id) });
        if (order.requires_account_activation && order.activation_email) {
          params.set("activationEmail", order.activation_email);
        }
        router.push(`/checkout/success?${params.toString()}`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to submit order.",
        );
      }
    });
  };

  const currency = items[0]?.product.currency ?? "RUB";

  return (
    <section className="section">
      <div className="container checkout-container">
        <h1>Checkout</h1>
        <div className="checkout-grid">
          <form className="checkout-form" onSubmit={handleSubmit}>
            <h2>Contact details</h2>
            <div className="auth-field-inline">
              <label className="auth-field">
                <span>Full name</span>
                <input
                  name="shipping_full_name"
                  defaultValue={defaultName}
                  placeholder="John Doe"
                  required
                />
              </label>
              <label className="auth-field">
                <span>Email</span>
                <input
                  name="customer_email"
                  type="email"
                  defaultValue={defaultEmail}
                  placeholder="user@example.com"
                  required
                />
              </label>
              <label className="auth-field">
                <span>Phone</span>
                <input
                  name="customer_phone"
                  type="tel"
                  placeholder="+1 555 123-4567"
                />
              </label>
            </div>

            <h2>Shipping address</h2>
            <div className="auth-field-inline">
              <label className="auth-field">
                <span>Address</span>
                <input
                  name="shipping_address"
                  placeholder="123 Main St"
                  required
                />
              </label>
              <label className="auth-field">
                <span>City</span>
                <input name="shipping_city" placeholder="New York" required />
              </label>
            </div>
            <div className="auth-field-inline">
              <label className="auth-field">
                <span>Postcode</span>
                <input name="shipping_postcode" placeholder="10001" />
              </label>
              <label className="auth-field">
                <span>Country</span>
                <input name="shipping_country" defaultValue="Russia" />
              </label>
            </div>

            <label className="auth-field">
              <span>Order notes</span>
              <textarea
                name="notes"
                rows={4}
                placeholder="Delivery instructions"
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button
              className="btn btn-primary auth-submit"
              type="submit"
              disabled={isPending}
            >
              {isPending ? "Submitting..." : "Place order"}
            </button>
          </form>

          <aside className="checkout-summary">
            <h2>Your order</h2>
            <ul className="checkout-items">
              {items.map((item) => (
                <li key={item.id}>
                  <span>
                    {item.product.name} x {item.quantity}
                  </span>
                  <span>{formatCurrency(currency, item.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="checkout-summary__total">
              <span>Total</span>
              <span>{formatCurrency(currency, subtotal)}</span>
            </div>
            <p className="checkout-summary__hint">
              A confirmation email will be sent once the order is placed. Guest
              checkouts receive an additional email with a link to set a
              password and activate the automatically created account.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
