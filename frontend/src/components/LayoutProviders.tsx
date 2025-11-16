"use client";

import { PropsWithChildren } from "react";
import { AuthSessionProvider } from "@/components/SessionProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export function LayoutProviders({ children }: PropsWithChildren) {
  return (
    <AuthSessionProvider>
      <Header />
      <main>{children}</main>
      <Footer />
    </AuthSessionProvider>
  );
}
