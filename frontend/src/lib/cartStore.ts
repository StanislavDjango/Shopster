import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { API_BASE_URL } from "@/lib/config";

type ProductImage = {
  id: number;
  image: string;
  alt_text: string;
  is_main: boolean;
};

type ProductSummary = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  short_description: string;
  price: string;
  currency: string;
  stock: number;
  images: ProductImage[];
};

export type CartItem = {
  id: number;
  quantity: number;
  subtotal: number;
  product: ProductSummary;
};

type CartApiResponse = {
  id: string;
  items: Array<{
    id: number;
    quantity: number;
    subtotal: string;
    product: ProductSummary;
  }>;
  subtotal: string;
  total_items: number;
};

export type CheckoutPayload = {
  customer_email: string;
  customer_phone?: string;
  shipping_full_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postcode?: string;
  shipping_country?: string;
  notes?: string;
};

export type CheckoutResult = {
  id: number;
  customer_email: string;
  requires_account_activation?: boolean;
  activation_email?: string;
};

type CartState = {
  cartId: string | null;
  items: CartItem[];
  subtotal: number;
  totalItems: number;
  isLoading: boolean;
  error: string | null;
  resetCartState: () => void;
  ensureCart: () => Promise<string>;
  loadCart: () => Promise<void>;
  addItem: (productId: number, quantity?: number) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => void;
  checkout: (payload: CheckoutPayload) => Promise<CheckoutResult>;
};

const noopStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
  key: () => null,
  length: 0,
} as Storage;

function getStorage() {
  if (typeof window === "undefined") {
    return noopStorage;
  }
  return window.localStorage;
}

function parseCartResponse(
  data: CartApiResponse,
): Pick<CartState, "items" | "subtotal" | "totalItems"> {
  const items: CartItem[] = data.items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    subtotal: Number(item.subtotal),
    product: item.product,
  }));
  return {
    items,
    subtotal: Number(data.subtotal),
    totalItems: data.total_items,
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartId: null,
      items: [],
      subtotal: 0,
      totalItems: 0,
      isLoading: false,
      error: null,
      // helper to reset all cart-related data when backend cart disappears
      resetCartState: () => {
        set({
          cartId: null,
          items: [],
          subtotal: 0,
          totalItems: 0,
          isLoading: false,
          error: null,
        });
      },

      ensureCart: async () => {
        const { cartId } = get();
        if (cartId) {
          return cartId;
        }
        const response = await fetch(`${API_BASE_URL}/api/carts/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          throw new Error("Failed to create cart.");
        }
        const data = (await response.json()) as CartApiResponse;
        set({ cartId: data.id, ...parseCartResponse(data) });
        return data.id;
      },

      loadCart: async () => {
        const { cartId, resetCartState } = get();
        if (!cartId) {
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE_URL}/api/carts/${cartId}/`);
          if (!response.ok) {
            if (response.status === 404) {
              resetCartState();
              set({ error: "Cart session was refreshed. Please try again." });
              return;
            }
            throw new Error("Failed to load cart.");
          }
          const data = (await response.json()) as CartApiResponse;
          set({ ...parseCartResponse(data), isLoading: false, error: null });
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : "Failed to load cart.",
          });
        }
      },

      addItem: async (productId: number, quantity = 1) => {
        const { resetCartState } = get();
        const ensureAndPost = async (id: string): Promise<Response> => {
          return fetch(`${API_BASE_URL}/api/carts/${id}/items/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product_id: productId, quantity }),
          });
        };

        let cartId = await get().ensureCart();
        const existing = get().items.find(
          (item) => item.product.id === productId,
        );
        try {
          if (existing) {
            return get().updateItem(existing.id, existing.quantity + quantity);
          }
          let response = await ensureAndPost(cartId);
          if (response.status === 404) {
            // cart does not exist anymore, reset state and retry once
            resetCartState();
            set({ error: "Cart session was refreshed. Please try again." });
            cartId = await get().ensureCart();
            response = await ensureAndPost(cartId);
          }
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            const message =
              typeof data === "object" && data
                ? Object.values(data as Record<string, string[]>)
                    .flat()
                    .join(" ")
                : "Failed to add product to cart.";
            throw new Error(message);
          }
          await get().loadCart();
        } catch (err) {
          set({
            error:
              err instanceof Error
                ? err.message
                : "Failed to add product to cart.",
          });
          throw err;
        }
      },

      updateItem: async (itemId: number, quantity: number) => {
        const { cartId, resetCartState } = get();
        if (!cartId) {
          return;
        }
        const safeQty = Math.max(1, quantity);
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/carts/${cartId}/items/${itemId}/`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ quantity: safeQty }),
            },
          );
          if (!response.ok) {
            if (response.status === 404) {
              resetCartState();
              set({ error: "Cart session was refreshed. Please try again." });
            }
            throw new Error("Failed to update cart.");
          }
          await get().loadCart();
        } catch (err) {
          set({
            error:
              err instanceof Error ? err.message : "Failed to update cart.",
          });
          throw err;
        }
      },

      removeItem: async (itemId: number) => {
        const { cartId, loadCart, resetCartState } = get();
        if (!cartId) {
          return;
        }
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/carts/${cartId}/items/${itemId}/`,
            {
              method: "DELETE",
            },
          );
          if (!response.ok) {
            if (response.status === 404) {
              resetCartState();
              set({ error: "Cart session was refreshed. Please try again." });
            }
            throw new Error("Failed to remove product from cart.");
          }
          await loadCart();
        } catch (err) {
          set({
            error:
              err instanceof Error
                ? err.message
                : "Failed to remove product from cart.",
          });
          throw err;
        }
      },

      clearCart: () => {
        const { resetCartState } = get();
        resetCartState();
      },

      checkout: async (payload: CheckoutPayload): Promise<CheckoutResult> => {
        const { cartId, clearCart } = get();
        if (!cartId) {
          throw new Error("Cart is empty.");
        }
        const response = await fetch(`${API_BASE_URL}/api/orders/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cart_id: cartId,
            shipping_amount: 0,
            currency: "RUB",
            ...payload,
          }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const message =
            typeof data === "object" && data
              ? Object.values(data as Record<string, string[]>)
                  .flat()
                  .join(" ")
              : "Failed to submit order.";
          throw new Error(message);
        }
        const order: CheckoutResult = await response.json();
        clearCart();
        return order;
      },
    }),
    {
      name: "shopster-cart",
      storage: createJSONStorage(getStorage),
      partialize: (state) => ({ cartId: state.cartId }),
    },
  ),
);
