import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const H = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Content-Type':'application/json' };

serve(async (req) => {
  if (req.method==='OPTIONS') return new Response(null,{headers:H});
  try{
    const { plan_id } = await req.json();
    if (!plan_id) return new Response(JSON.stringify({ success:false, message:'plan_id required' }), { headers:H, status:400 });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data, error } = await admin.functions.invoke('skiclubpro-register', { body:{ plan_id }});
    if (error || !data?.success) return new Response(JSON.stringify({ success:false, message:data?.message||error?.message }), { headers:H, status:500 });
    return new Response(JSON.stringify({ success:true, data }), { headers:H });
  }catch(e:any){
    return new Response(JSON.stringify({ success:false, message:e?.message||'error' }), { headers:H, status:500 });
  }
});