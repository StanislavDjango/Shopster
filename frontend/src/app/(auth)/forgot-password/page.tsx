"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import { API_BASE_URL } from "@/lib/config";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    if (!email) {
      setError("Email is required.");
      return;
    }

    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/password/reset/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          },
        );
        if (!response.ok) {
          throw new Error(
            "Failed to send reset email. Please try again later.",
          );
        }
        setSubmitted(true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to send reset email.",
        );
      }
    });
  };

  if (submitted) {
    return (
      <section className="section">
        <div className="container auth-card">
          <h1>Check your inbox</h1>
          <p className="auth-subtitle">
            If the address is registered, we have sent instructions for
            resetting your password. Please check spam if you cannot find the
            message.
          </p>
          <button
            className="btn btn-primary auth-submit"
            onClick={() => router.push("/signin")}
          >
            Back to sign in
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container auth-card">
        <h1>Forgot password?</h1>
        <p className="auth-subtitle">
          Enter the email you used during registration. We will send a recovery
          link.
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              placeholder="user@example.com"
              required
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button
            className="btn btn-primary auth-submit"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Sending..." : "Send recovery link"}
          </button>
        </form>
        <p className="auth-hint">
          <Link href="/signin">Back to sign in</Link>
        </p>
      </div>
    </section>
  );
}
