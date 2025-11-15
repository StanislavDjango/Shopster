"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";
import { AlgoliaSearch } from "@/components/AlgoliaSearch";
import { CartBadge } from "@/components/CartBadge";
import { AdminNavLink } from "@/components/AdminNavLink";
import styles from "./Header.module.css";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.container}>
        <div className={styles.logoSection}>
          <Link href="/" className={styles.logo}>
            <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M7 7h10M7 12h10M7 17h5" />
            </svg>
            <span className={styles.logoText}>Shopster</span>
          </Link>
        </div>

        <nav className={`${styles.nav} ${mobileMenuOpen ? styles.navOpen : ""}`}>
          <ul>
            <li>
              <Link href="/#features" onClick={() => setMobileMenuOpen(false)}>
                Features
              </Link>
            </li>
            <li>
              <Link href="/products" onClick={() => setMobileMenuOpen(false)}>
                Catalog
              </Link>
            </li>
            <li>
              <AdminNavLink />
            </li>
          </ul>
        </nav>

        <div className={styles.actionsWrapper}>
          <div className={styles.actions}>
            <AlgoliaSearch />
            <CartBadge />
            <AccountMenu />
          </div>
          <button 
            className={`${styles.mobileMenuButton} ${mobileMenuOpen ? styles.active : ""}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>
  );
}