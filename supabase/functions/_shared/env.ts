// supabase/functions/_shared/env.ts
export function getConfig() {
  const providerMode = (Deno.env.get("PROVIDER_MODE") ?? "mock").toLowerCase(); // mock | live
  const providerBase = Deno.env.get("PROVIDER_BASE_URL") ?? "";
  return { providerMode, providerBase };
}

export function buildSecurityHeaders() {
  return {
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  };
}
