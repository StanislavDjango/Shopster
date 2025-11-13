"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import { API_BASE_URL } from "@/lib/config";

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") || "");
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const passwordConfirm = String(formData.get("password_confirm") || "");
    const firstName = String(formData.get("first_name") || "");
    const lastName = String(formData.get("last_name") || "");

    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            email,
            password,
            password_confirm: passwordConfirm,
            first_name: firstName,
            last_name: lastName,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const message =
            typeof data === "object" && data
              ? Object.values(data as Record<string, string[]>)
                  .flat()
                  .join(" ")
              : "Could not create account.";
          setError(message || "Could not create account.");
          return;
        }

        const result = await signIn("credentials", {
          identifier: username,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError(
            "Account created but automatic sign-in failed. Please log in manually.",
          );
          router.push("/signin");
          return;
        }

        router.push("/account");
      } catch (err) {
        console.error(err);
        setError("Could not create account. Try again later.");
      }
    });
  };

  return (
    <section className="section">
      <div className="container auth-card">
        <h1>Create account</h1>
        <p className="auth-subtitle">
          Sign up to manage your orders, addresses and discounts.
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Username</span>
            <input
              name="username"
              type="text"
              placeholder="myshopper"
              required
              minLength={2}
            />
          </label>
          <label className="auth-field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              placeholder="user@example.com"
              required
            />
          </label>
          <div className="auth-field-inline">
            <label className="auth-field">
              <span>First name</span>
              <input name="first_name" type="text" placeholder="John" />
            </label>
            <label className="auth-field">
              <span>Last name</span>
              <input name="last_name" type="text" placeholder="Doe" />
            </label>
          </div>
          <label className="auth-field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </label>
          <label className="auth-field">
            <span>Confirm password</span>
            <input
              name="password_confirm"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button
            className="btn btn-primary auth-submit"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Creating..." : "Create account"}
          </button>
        </form>
        <p className="auth-hint">
          Already have an account? <Link href="/signin">Sign in</Link>
        </p>
      </div>
    </section>
  );
}
