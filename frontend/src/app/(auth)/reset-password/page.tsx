"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState, useTransition } from "react";

import { API_BASE_URL } from "@/lib/config";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";

  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    const passwordConfirm = String(formData.get("password_confirm") || "");

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/password/reset/confirm/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uid,
              token,
              password,
              password_confirm: passwordConfirm,
            }),
          },
        );
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const message =
            typeof data === "object" && data
              ? Object.values(data as Record<string, string[]>)
                  .flat()
                  .join(" ")
              : "Failed to update password.";
          throw new Error(message);
        }
        setCompleted(true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update password.",
        );
      }
    });
  };

  if (!uid || !token) {
    return (
      <section className="section">
        <div className="container auth-card">
          <h1>Invalid link</h1>
          <p className="auth-subtitle">
            Check that you used the latest link from the recovery email.
          </p>
          <Link className="btn btn-primary auth-submit" href="/forgot-password">
            Request a new link
          </Link>
        </div>
      </section>
    );
  }

  if (completed) {
    return (
      <section className="section">
        <div className="container auth-card">
          <h1>Password updated</h1>
          <p className="auth-subtitle">
            You can now sign in using your new password.
          </p>
          <button
            className="btn btn-primary auth-submit"
            onClick={() => router.push("/signin")}
          >
            Go to sign in
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container auth-card">
        <h1>Set a new password</h1>
        <p className="auth-subtitle">Enter a new password for your account.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>New password</span>
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
            {isPending ? "Saving..." : "Update password"}
          </button>
        </form>
        <p className="auth-hint">
          Remembered your password? <Link href="/signin">Sign in</Link>
        </p>
      </div>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
