import type { Metadata } from "next";

export const SITE_NAME = "Shopster";
export const SITE_DESCRIPTION =
  "Shopster вЂ” РјРѕРґСѓР»СЊРЅС‹Р№ ecommerce: РєР°С‚Р°Р»РѕРі, РєРѕСЂР·РёРЅР°, Р·Р°РєР°Р·С‹, РїРѕРёСЃРє Рё Р°РІС‚РѕСЂРёР·Р°С†РёСЏ. Р’С‹Р±РёСЂР°Р№С‚Рµ Р»СѓС‡С€РёРµ С‚РѕРІР°СЂС‹ Рё РѕС„РѕСЂРјР»СЏР№С‚Рµ РїРѕРєСѓРїРєСѓ РѕРЅР»Р°Р№РЅ.";
const DEFAULT_SITE_URL = "http://localhost:3000";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export const DEFAULT_OG_IMAGE = "https://dummyimage.com/1200x630/0f172a/ffffff.png&text=Shopster";

export const defaultMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s В· ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
};
