// supabase/functions/_shared/env.ts
export function getConfig() {
  const providerMode = (Deno.env.get("PROVIDER_MODE") ?? "mock").toLowerCase(); // mock | live
  const vgsEnabled = (Deno.env.get("VGS_PROXY_ENABLED") ?? "false") === "true";
  const providerBase = Deno.env.get("PROVIDER_BASE_URL") ?? "";
  return { providerMode, vgsEnabled, providerBase };
}

export function buildSecurityHeaders() {
  return {
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  };
}

export function maybeCreateProxyClient(vgsEnabled: boolean) {
  if (!vgsEnabled) return undefined;
  const host = Deno.env.get("VGS_PROXY_HOST")!;
  const username = Deno.env.get("VGS_PROXY_USERNAME")!;
  const password = Deno.env.get("VGS_PROXY_PASSWORD")!;
  return Deno.createHttpClient({
    proxy: {
      url: `https://${host}:8443`,
      basicAuth: { username, password },
    },
  });
}