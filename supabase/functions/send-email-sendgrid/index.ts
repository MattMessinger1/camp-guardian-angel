import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EmailType = "pending" | "success" | "failure" | "activation";

type Payload = {
  type: EmailType;
  registration_id?: string;
  breakdown?: Array<{ type: string; status: string; amount_cents: number }>;
  user_id?: string; // for activation
};

function usd(cents: number | null | undefined) {
  const v = typeof cents === 'number' ? cents : 0;
  return `$${(v / 100).toFixed(2)}`;
}

async function sendWithSendGrid(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("SENDGRID_API_KEY");
  const fromEmail = Deno.env.get("SENDGRID_FROM_EMAIL");
  if (!apiKey) throw new Error("SENDGRID_API_KEY is not set");
  if (!fromEmail) throw new Error("SENDGRID_FROM_EMAIL is not set");

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: "Camp Registration" },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`SendGrid error ${res.status}: ${txt}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const body = (await req.json()) as Payload;
    if (!body?.type) throw new Error("type is required");

    // Helpers to load registration/session/user
    const loadByRegistration = async (registration_id: string) => {
      const { data: reg, error: regErr } = await admin
        .from("registrations")
        .select("id, user_id, session_id, priority_opt_in")
        .eq("id", registration_id)
        .maybeSingle();
      if (regErr || !reg) throw new Error("Registration not found");

      const { data: session, error: sesErr } = await admin
        .from("sessions")
        .select("id, title, start_at, end_at, upfront_fee_cents")
        .eq("id", reg.session_id)
        .maybeSingle();
      if (sesErr || !session) throw new Error("Session not found");

      const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(reg.user_id);
      if (userErr || !userRes?.user?.email) throw new Error("User email not found");

      return { reg, session, email: userRes.user.email as string };
    };

    if (body.type === "pending") {
      if (!body.registration_id) throw new Error("registration_id required for pending");
      const { session, email } = await loadByRegistration(body.registration_id);
      const subject = `Request received: ${session.title ?? "Camp Session"}`;
      const html = `
        <h2>We received your request</h2>
        <p>Thanks for submitting your registration request for <strong>${session.title ?? "Camp Session"}</strong>.</p>
        <p>We will run allocations when registration opens${session.start_at ? ` for the session starting on ${new Date(session.start_at).toLocaleDateString()}` : ""}.</p>
        <p>No charge will be made unless your spot is accepted.</p>
      `;
      await sendWithSendGrid(email, subject, html);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    if (body.type === "failure") {
      if (!body.registration_id) throw new Error("registration_id required for failure");
      const { session, email } = await loadByRegistration(body.registration_id);
      const subject = `No spot available: ${session.title ?? "Camp Session"}`;
      const origin = Deno.env.get("PUBLIC_APP_ORIGIN") || "https://ezvwyfqtyanwnoyymhav.supabase.co";
      const html = `
        <h2>We're sorry — no spot this time</h2>
        <p>We couldn't allocate a spot for <strong>${session.title ?? "Camp Session"}</strong>. You have not been charged.</p>
        <p>Explore other sessions here: <a href="${origin}/sessions">Browse sessions</a>.</p>
      `;
      await sendWithSendGrid(email, subject, html);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    if (body.type === "success") {
      if (!body.registration_id) throw new Error("registration_id required for success");
      const { session, email } = await loadByRegistration(body.registration_id);
      const breakdown = body.breakdown || [];
      const total = breakdown.reduce((s, b) => s + (b.amount_cents || 0), 0);
      const subject = `You're in: ${session.title ?? "Camp Session"}`;
      const lines = breakdown.map(b => `<li>${b.type.replaceAll('_',' ')}: ${usd(b.amount_cents)} — ${b.status}</li>`).join("");
      const html = `
        <h2>Success! Your spot is confirmed</h2>
        <p>You're confirmed for <strong>${session.title ?? "Camp Session"}</strong>${session.start_at ? ` starting ${new Date(session.start_at).toLocaleDateString()}` : ""}.</p>
        <h3>Payment breakdown</h3>
        <ul>${lines}</ul>
        <p><strong>Total charged:</strong> ${usd(total)}</p>
      `;
      await sendWithSendGrid(email, subject, html);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    if (body.type === "activation") {
      const userId = body.user_id;
      if (!userId) throw new Error("user_id required for activation");
      const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(userId);
      if (userErr || !userRes?.user?.email) throw new Error("User email not found");
      const subject = `Your account is activated`;
      const html = `
        <h2>Welcome!</h2>
        <p>Your account has been activated. You're all set to register for camps.</p>
      `;
      await sendWithSendGrid(userRes.user.email as string, subject, html);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    return new Response(JSON.stringify({ error: "Unsupported type" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[SEND-EMAIL-SENDGRID] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
