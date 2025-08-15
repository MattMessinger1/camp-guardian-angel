// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function embed(q: string | null) {
  if (!q || !q.trim()) return null;
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ input: q, model: "text-embedding-3-small" })
  });
  const json = await res.json();
  if (!res.ok) throw new Response(JSON.stringify(json), { status: res.status });
  return json.data[0].embedding;
}

serve(async (req) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const city = url.searchParams.get("city");
  const start = url.searchParams.get("start"); // YYYY-MM-DD
  const end = url.searchParams.get("end");
  const platform = url.searchParams.get("platform");
  const page = parseInt(url.searchParams.get("page") ?? "0");
  const limit = parseInt(url.searchParams.get("limit") ?? "20");

  try {
    const qEmbedding = await embed(q);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false }
    });

    // Call RPC
    const { data, error } = await supabase.rpc("search_unified", {
      q,
      q_embedding: qEmbedding,
      p_city: city,
      p_start: start ? new Date(start) : null,
      p_end: end ? new Date(end) : null,
      p_platform: platform,
      p_limit: limit,
      p_offset: page * limit
    });
    if (error) throw error;

    return new Response(JSON.stringify({ items: data }), {
      headers: {
        "Content-Type": "application/json",
        // cache: short TTL + allow CDN/edge cache
        "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
        "Vary": "q, city, start, end, platform, page, limit"
      }
    });
  } catch (e: any) {
    const status = e?.status ?? 500;
    return new Response(JSON.stringify({ error: e?.message ?? "search_error" }), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  }
});