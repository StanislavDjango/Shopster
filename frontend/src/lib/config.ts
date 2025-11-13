export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const rawBackendOrigin =
  process.env["NEXT_PUBLIC_BACKEND_ORIGIN"] ??
  process.env["NEXT_PUBLIC_API_BASE_URL"] ??
  "http://localhost:8000";

export const BACKEND_ORIGIN = rawBackendOrigin.replace(/\/$/, "");
