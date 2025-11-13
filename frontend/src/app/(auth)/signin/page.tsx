"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("identifier") || "");
    const password = String(formData.get("password") || "");
    if (!identifier || !password) {
      setError("Enter email (or username) and password.");
      return;
    }

    startTransition(async () => {
      const result = await signIn("credentials", {
        identifier,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Could not sign in. Check your credentials.");
        return;
      }
      setError(null);
      router.push("/account");
    });
  };

  return (
    <section className="section">
      <div className="container auth-card">
        <h1>Sign in</h1>
        <p className="auth-subtitle">
          Use the email (or username) and password specified during
          registration.
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email or username</span>
            <input
              name="identifier"
              type="text"
              placeholder="user@example.com"
              required
              minLength={2}
            />
          </label>
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
          {error && <p className="auth-error">{error}</p>}
          <button
            className="btn btn-primary auth-submit"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="auth-hint">
          No account yet? <Link href="/signup">Create one</Link>
        </p>
        <p className="auth-hint">
          <Link href="/forgot-password">Forgot password?</Link>
        </p>
      </div>
    </section>
  );
}
