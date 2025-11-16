"use client";

import Link from "next/link";
import styles from "./Footer.module.css";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          {/* Brand Section */}
          <div className={styles.section}>
            <div className={styles.logo}>
              <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 7h10M7 12h10M7 17h5" />
              </svg>
              <span className={styles.logoText}>Shopster</span>
            </div>
            <p className={styles.description}>
              Modern e-commerce platform with beautiful UI and powerful features
            </p>
            <div className={styles.socials}>
              <a href="#" aria-label="Twitter" className={styles.socialLink}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 7-7 7-7" />
                </svg>
              </a>
              <a href="#" aria-label="GitHub" className={styles.socialLink}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a href="#" aria-label="LinkedIn" className={styles.socialLink}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.722-2.005 1.42-.103.249-.129.597-.129.946v5.439h-3.554s.047-8.842 0-9.769h3.554v1.382c.43-.665 1.198-1.61 2.914-1.61 2.122 0 3.71 1.385 3.71 4.363v5.634zM5.337 8.855c-1.144 0-1.915-.762-1.915-1.715 0-.955.77-1.715 1.95-1.715 1.18 0 1.915.76 1.94 1.715 0 .953-.76 1.715-1.975 1.715zm1.946 11.597H3.392V9.683h3.891v10.769zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Quick Links</h4>
            <ul className={styles.linksList}>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/products">Catalog</Link>
              </li>
              <li>
                <Link href="/#features">Features</Link>
              </li>
              <li>
                <Link href="/cart">Shopping Cart</Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Customer Service</h4>
            <ul className={styles.linksList}>
              <li>
                <a href="mailto:support@shopster.com">Support</a>
              </li>
              <li>
                <a href="#">Returns Policy</a>
              </li>
              <li>
                <a href="#">Shipping Info</a>
              </li>
              <li>
                <a href="#">FAQ</a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Company</h4>
            <ul className={styles.linksList}>
              <li>
                <a href="#">About Us</a>
              </li>
              <li>
                <a href="#">Blog</a>
              </li>
              <li>
                <a href="#">Careers</a>
              </li>
              <li>
                <a href="#">Contact</a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Legal</h4>
            <ul className={styles.linksList}>
              <li>
                <a href="#">Privacy Policy</a>
              </li>
              <li>
                <a href="#">Terms of Service</a>
              </li>
              <li>
                <a href="#">Cookie Policy</a>
              </li>
              <li>
                <a href="#">Disclaimer</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className={styles.bottom}>
          <div className={styles.copyright}>
            <p>&copy; {currentYear} Shopster. All rights reserved.</p>
          </div>
          <div className={styles.payment}>
            <span>We accept:</span>
            <div className={styles.paymentMethods}>
              <span className={styles.method}>Visa</span>
              <span className={styles.method}>Mastercard</span>
              <span className={styles.method}>PayPal</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
