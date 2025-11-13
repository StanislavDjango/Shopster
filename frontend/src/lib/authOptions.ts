import { Buffer } from "buffer";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { API_BASE_URL } from "@/lib/config";

type BackendUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  profile?: {
    phone?: string;
    avatar?: string | null;
    default_shipping_address?: string;
    default_shipping_city?: string;
    default_shipping_postcode?: string;
    default_shipping_country?: string;
  };
};

type LoginResponse = {
  access: string;
  refresh: string;
};

type DecodedJWT = {
  exp: number;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json() as Promise<T>;
}

function decodeJwt(token: string): DecodedJWT {
  const [, payload] = token.split(".");
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(normalized, "base64").toString("utf-8");
  return JSON.parse(json);
}

async function login(identifier: string, password: string) {
  const loginData = await fetchJson<LoginResponse>(
    `${API_BASE_URL}/api/auth/login/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: identifier, password }),
    },
  );

  const user = await fetchJson<BackendUser>(`${API_BASE_URL}/api/auth/me/`, {
    headers: {
      Authorization: `Bearer ${loginData.access}`,
      "Content-Type": "application/json",
    },
  });

  const decoded = decodeJwt(loginData.access);

  return {
    user,
    tokens: {
      accessToken: loginData.access,
      refreshToken: loginData.refresh,
      accessTokenExpires: decoded.exp * 1000,
    },
  };
}

async function refreshAccessToken(token: any) {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: token.refreshToken }),
  });

  if (!response.ok) {
    throw new Error("Refresh token request failed");
  }

  const data: LoginResponse = await response.json();
  const decoded = decodeJwt(data.access);

  return {
    ...token,
    accessToken: data.access,
    accessTokenExpires: decoded.exp * 1000,
  };
}

export const authOptions: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!identifier || !password) {
          return null;
        }
        try {
          const { user, tokens } = await login(identifier, password);
          return {
            ...user,
            ...tokens,
          } as any;
        } catch (error) {
          console.error("Authorize error", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          user: {
            id: (user as any).id,
            username: (user as any).username,
            email: (user as any).email,
            first_name: (user as any).first_name,
            last_name: (user as any).last_name,
            is_staff: (user as any).is_staff,
            is_superuser: (user as any).is_superuser,
            profile: (user as any).profile,
          },
          accessToken: (user as any).accessToken,
          refreshToken: (user as any).refreshToken,
          accessTokenExpires: (user as any).accessTokenExpires,
        };
      }

      if (Date.now() < (token.accessTokenExpires as number) - 5000) {
        return token;
      }

      try {
        return await refreshAccessToken(token);
      } catch (error) {
        console.error("Error refreshing access token", error);
        return {
          ...token,
          error: "RefreshAccessTokenError",
        };
      }
    },
    async session({ session, token }) {
      if (token?.error) {
        (session as any).error = token.error;
      }
      if (token?.user) {
        session.user = token.user as any;
      }
      if (token?.accessToken) {
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
};

export { API_BASE_URL as BACKEND_URL };
