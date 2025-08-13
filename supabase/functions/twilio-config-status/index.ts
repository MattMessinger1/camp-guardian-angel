import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function mask(val?: string | null) {
  if (!val) return null;
  const s = String(val);
  if (s.length <= 8) return `${s[0] ?? ''}***${s[s.length - 1] ?? ''}`;
  return `${s.slice(0, 4)}***${s.slice(-4)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read server-only env vars (Supabase Edge Function secrets)
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
    const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");
    const APP_BASE_URL = Deno.env.get("APP_BASE_URL");

    const flags = {
      twilio_account_sid: !!TWILIO_ACCOUNT_SID,
      twilio_auth_token: !!TWILIO_AUTH_TOKEN,
      twilio_messaging_service_sid: !!TWILIO_MESSAGING_SERVICE_SID,
      twilio_from_number: !!TWILIO_FROM_NUMBER,
      app_base_url: !!APP_BASE_URL,
    } as const;

    let using: "messaging_service" | "from_number" | "none" = "none";
    if (flags.twilio_messaging_service_sid) using = "messaging_service";
    else if (flags.twilio_from_number) using = "from_number";

    const ok = flags.twilio_account_sid && flags.twilio_auth_token && using !== "none";

    const body = {
      ok,
      using,
      variables: {
        TWILIO_ACCOUNT_SID: { set: flags.twilio_account_sid, masked: mask(TWILIO_ACCOUNT_SID) },
        TWILIO_AUTH_TOKEN: { set: flags.twilio_auth_token, masked: mask(TWILIO_AUTH_TOKEN) },
        TWILIO_MESSAGING_SERVICE_SID: { set: flags.twilio_messaging_service_sid, masked: mask(TWILIO_MESSAGING_SERVICE_SID) },
        TWILIO_FROM_NUMBER: { set: flags.twilio_from_number, masked: mask(TWILIO_FROM_NUMBER) },
        APP_BASE_URL: { set: flags.app_base_url, masked: APP_BASE_URL || null },
      },
      warnings: [
        !flags.twilio_messaging_service_sid && !flags.twilio_from_number
          ? "Provide either TWILIO_MESSAGING_SERVICE_SID (recommended) or TWILIO_FROM_NUMBER."
          : null,
        !flags.app_base_url ? "APP_BASE_URL is missing (used for links/webhooks)." : null,
      ].filter(Boolean),
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
