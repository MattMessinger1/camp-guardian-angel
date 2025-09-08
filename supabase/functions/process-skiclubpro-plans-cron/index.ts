import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const H = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Content-Type":"application/json" };

serve(async (req) => {
  if (req.method==='OPTIONS') return new Response(null,{headers:H});
  try{
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date().toISOString();

    const { data: plans } = await admin
      .from('registration_plans')
      .select('id, status, provider_url, detect_url')
      .eq('open_strategy','manual')
      .lte('manual_open_at', now)
      .in('status',['ready','scheduled','pending','draft'])
      .or('provider_url.ilike.%.skiclubpro.team,detect_url.ilike.%.skiclubpro.team');

    let processed=0, ok=0, fail=0;

    for (const p of (plans||[])) {
      await admin.from('registration_plans').update({ status:'executing' }).eq('id', p.id).in('status',['ready','scheduled','pending','draft']);
      const { data, error } = await admin.functions.invoke('skiclubpro-register', { body:{ plan_id: p.id }});
      processed++;
      if (error || !data?.success) {
        fail++;
        await admin.from('registration_plans').update({ status:'failed' }).eq('id', p.id);
      } else {
        ok++;
        await admin.from('registration_plans').update({ status:'completed' }).eq('id', p.id);
      }
    }
    return new Response(JSON.stringify({ success:true, processed, ok, fail }), { headers:H });
  }catch(e:any){
    return new Response(JSON.stringify({ success:false, message:e?.message||'error' }), { headers:H, status:500 });
  }
});