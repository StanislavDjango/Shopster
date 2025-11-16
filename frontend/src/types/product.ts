export type ReviewUser = {
  id: number | null;
  name: string;
};

export type ReviewProductInfo = {
  id: number;
  slug: string;
  name: string;
};

export type ProductReview = {
  id: number;
  product?: ReviewProductInfo;
  product_id?: number;
  rating: number;
  title: string;
  body: string;
  verified_purchase: boolean;
  moderation_status: "pending" | "approved" | "rejected";
  moderation_note?: string;
  created_at: string;
  updated_at: string;
  user: ReviewUser;
  is_owner: boolean;
};

export type Product = {
  id: number;
  brand: string;
  name: string;
  slug: string;
  sku: string;
  short_description: string;
  description: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  price: string;
  currency: string;
  stock: number;
  category: {
    id: number;
    name: string;
    slug: string;
    description: string;
    meta_title: string;
    meta_description: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
  } | null;
  images: Array<{
    id: number;
    image: string;
    alt_text: string;
    is_main: boolean;
  }>;
  average_rating: number | null;
  reviews_count: number;
  can_review: boolean;
  user_review: ProductReview | null;
  created_at?: string;
  updated_at?: string;
};

export type CategorySummary = {
  id: number;
  name: string;
  slug: string;
  meta_title?: string;
  meta_description?: string;
};
