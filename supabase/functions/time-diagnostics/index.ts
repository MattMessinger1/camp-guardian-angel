import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TimeDiagnosticsRequest {
  client_time_ms: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serverTimeMs = Date.now();
    
    if (req.method === "GET") {
      // Simple GET request - just return server time
      return new Response(JSON.stringify({
        server_time_ms: serverTimeMs,
        server_time_iso: new Date(serverTimeMs).toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (req.method === "POST") {
      // POST request with client time for comparison
      const body = await req.json() as TimeDiagnosticsRequest;
      const clientTimeMs = body.client_time_ms;
      
      if (!clientTimeMs) {
        return new Response(JSON.stringify({ error: "client_time_ms is required" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const skewMs = serverTimeMs - clientTimeMs;
      
      console.log(`[TIME-DIAGNOSTICS] Server: ${serverTimeMs}, Client: ${clientTimeMs}, Skew: ${skewMs}ms`);

      return new Response(JSON.stringify({
        server_time_ms: serverTimeMs,
        client_time_ms: clientTimeMs,
        skew_ms: skewMs,
        server_time_iso: new Date(serverTimeMs).toISOString(),
        client_time_iso: new Date(clientTimeMs).toISOString(),
        abs_skew_ms: Math.abs(skewMs),
        skew_direction: skewMs > 0 ? "server_ahead" : "client_ahead",
        needs_correction: Math.abs(skewMs) > 500,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });

  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[TIME-DIAGNOSTICS] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});