"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";

export function AccountMenu() {
  const { data: session, status } = useSession();
  const user = session?.user;

  if (status === "loading") {
    return <span className="nav-loading">...</span>;
  }

  if (!user) {
    return (
      <button
        className="btn btn-outline nav-auth"
        onClick={() => signIn(undefined, { callbackUrl: "/account" })}
      >
        Sign in
      </button>
    );
  }

  const displayName =
    user.first_name || user.last_name
      ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
      : user.username;

  return (
    <div className="account-menu">
      <Link href="/account" className="account-menu__link">
        {displayName || user.email}
      </Link>
      <button
        className="btn btn-outline nav-auth"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        Sign out
      </button>
    </div>
  );
}
