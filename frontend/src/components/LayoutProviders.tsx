"use client";

import { AuthSessionProvider } from "@/components/SessionProvider";
import { Header } from "@/components/Header";

export function LayoutProviders({ children }: PropsWithChildren) {
  return (
    <AuthSessionProvider>
      <Header />
      <main>{children}</main>
      <footer className="footer">
        <div className="container footer-wrapper">
          <p>&copy; {new Date().getFullYear()} Shopster</p>
          <div className="footer-links">
            <a href="mailto:shop@example.com">shop@example.com</a>
            <a href="tel:+79991234567">+7 (999) 123-45-67</a>
          </div>
        </div>
      </footer>
    </AuthSessionProvider>
  );
}
