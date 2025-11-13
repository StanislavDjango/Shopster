"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

import { BACKEND_ORIGIN } from "@/lib/config";

export function AdminNavLink() {
  const { data: session } = useSession();

  if (!session?.user?.is_staff) {
    return null;
  }

  return (
    <>
      <Link href="/admin/stats">Admin dashboard</Link>
      <a
        href={`${BACKEND_ORIGIN}/admin/`}
        target="_blank"
        rel="noreferrer noopener"
      >
        Django admin
      </a>
    </>
  );
}
