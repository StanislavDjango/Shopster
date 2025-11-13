"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CheckoutSuccessContent() {
  const search = useSearchParams();
  const orderId = search.get("order");
  const activationEmail = search.get("activationEmail");

  return (
    <section className="section">
      <div className="container auth-card">
        <h1>Thank you!</h1>
        <p className="auth-subtitle">
          {orderId
            ? `Order #${orderId} has been placed.`
            : "Your order has been placed."}
        </p>
        <p className="auth-subtitle">
          We will contact you soon to confirm the details.
        </p>
        {activationEmail && (
          <p className="auth-subtitle">
            We have created an account for you. Check{" "}
            <strong>{activationEmail}</strong> for a link to set your password
            and start tracking your orders.
          </p>
        )}
        <div className="checkout-success__actions">
          <Link className="btn btn-primary" href="/products">
            Continue shopping
          </Link>
          <Link className="btn btn-outline" href="/">
            Go to homepage
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
