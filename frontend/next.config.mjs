/** @type {import('next').NextConfig} */
const extraDevOrigins = (process.env.NEXT_DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const DEV_ALLOWED_ORIGINS = Array.from(
  new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://172.25.96.1:3000",
    "http://host.docker.internal:3000",
    ...extraDevOrigins,
  ]),
);

const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
let backendHost = "localhost";
let backendProtocol = "http";
let backendPort = "8000";
try {
  const parsed = new URL(backendUrl);
  backendHost = parsed.hostname;
  backendProtocol = parsed.protocol.replace(":", "") || "http";
  backendPort = parsed.port || "";
} catch {
  // keep defaults
}

const imageDomains = Array.from(new Set(["localhost", "127.0.0.1", "172.25.96.1", backendHost]));

const nextConfig = {
  images: {
    domains: imageDomains,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "172.25.96.1",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: backendHost,
        port: "",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: backendHost,
        port: "",
        pathname: "/media/**",
      },
      {
        protocol: backendProtocol,
        hostname: backendHost,
        port: backendPort,
        pathname: "/media/**",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_BUILD: process.env.NEXT_PUBLIC_APP_BUILD ?? "dev",
  },
  experimental: {
    serverActions: {
      allowedOrigins: DEV_ALLOWED_ORIGINS,
    },
  },
};

export default nextConfig;
