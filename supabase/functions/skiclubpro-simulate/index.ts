import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { getDecryptedCredentials } from '../_shared/account-credentials.ts';

const H = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Content-Type':'application/json' };

async function uploadScreenshot(admin:any, png:Uint8Array, key:string){
  await admin.storage.from('automation_screens').upload(key, new Blob([png],{type:'image/png'}), { upsert:true });
  return admin.storage.from('automation_screens').getPublicUrl(key).data.publicUrl;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: H });
  try {
    const { plan_id } = await req.json();
    if (!plan_id) return new Response(JSON.stringify({ success:false, message:'plan_id required' }), { headers: H, status:400 });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: plan } = await admin.from('registration_plans').select('*').eq('id', plan_id).single();
    if (!plan) return new Response(JSON.stringify({ success:false, message:'plan not found' }), { headers: H });

    const providerUrl = plan.provider_url || plan.detect_url || 'https://blackhawk.skiclubpro.team';
    const userId = plan.user_id;

    const { data: mappings } = await admin.from('plan_children_map').select('child_id, session_ids, priority').eq('plan_id', plan_id).order('priority');
    if (!mappings?.length) return new Response(JSON.stringify({ success:false, message:'no mappings' }), { headers: H });

    const sessIds = [...new Set(mappings.flatMap((m:any)=>m.session_ids||[]))];
    const { data: sessions } = await admin.from('sessions').select('id,title,site_locator').in('id', sessIds);
    const childIds = [...new Set(mappings.map((m:any)=>m.child_id))];
    const { data: children } = await admin.from('children').select('id,name').in('id', childIds);

    const creds = await getDecryptedCredentials({ userId, providerUrl });
    if (!creds?.email || !creds?.password) return new Response(JSON.stringify({ success:false, message:'missing credentials' }), { headers: H });

    const bbKey = Deno.env.get('BROWSERBASE_TOKEN')!;
    // Create session
    const mk = await fetch('https://api.browserbase.com/v1/sessions', { method:'POST', headers:{'Content-Type':'application/json','X-BB-API-Key':bbKey}, body: JSON.stringify({ browser_settings:{ headless:true }})});
    if (!mk.ok) throw new Error('Browserbase session create failed');
    const { id: sid } = await mk.json();

    async function act(body:any){ const r=await fetch(`https://api.browserbase.com/v1/sessions/${sid}/actions`,{method:'POST',headers:{'Content-Type':'application/json','X-BB-API-Key':bbKey},body:JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json();}
    async function snap(label:string){ const b=await fetch(`https://api.browserbase.com/v1/sessions/${sid}/screenshot`,{headers:{'X-BB-API-Key':bbKey}}); const png=new Uint8Array(await b.arrayBuffer()); const key=`simulate/${plan_id}/${Date.now()}_${label}.png`; return uploadScreenshot(admin, png, key); }

    const logs:any[] = [];
    function log(msg:string, extra:any={}){ logs.push({ t:new Date().toISOString(), msg, ...extra }); }

    // Login
    await act({ type:'goto', url: providerUrl }); log('goto', { providerUrl }); const s1=await snap('home');
    await act({ type:'wait_for_any', selectors:['input[type="email"]','input[name*="email"]'], timeout:15000 });
    await act({ type:'type', selector:'input[type="email"], input[name*="email"]', text:creds.email });
    await act({ type:'type', selector:'input[type="password"], input[name*="password"]', text:creds.password });
    await act({ type:'click_any', selectors:['button[type="submit"]','button:has-text("Login")','input[type="submit"]'] });
    await act({ type:'wait_network_idle', timeout:15000 }); const s2=await snap('after-login'); log('logged-in');

    // Memberships
    await act({ type:'click_any', selectors:['a:has-text("Memberships")','a:has-text("Membership")','nav >> text=Membership'] }).catch(()=>{log('no-membership-nav')});
    await act({ type:'wait_network_idle', timeout:8000 }).catch(()=>{}); const s3=await snap('memberships');

    // Register/Programs
    await act({ type:'click_any', selectors:['a:has-text("Register")','a:has-text("Programs")','nav >> text=Register'] });
    await act({ type:'wait_network_idle', timeout:12000 }); const s4=await snap('register');

    // Fuzzy find helper in-page
    const fuzzy = `
      (function(){
        function norm(s){return (s||'').toLowerCase().replace(/\\s+/g,' ').trim();}
        function score(hay,needle){ hay=norm(hay); needle=norm(needle); if(!needle) return 0; if(hay.includes(needle)) return 1; const toks=needle.split(' '); let hit=0; toks.forEach(t=>{ if(t && hay.includes(t)) hit++; }); return Math.min(0.9,0.5+hit/Math.max(3,toks.length)); }
        window.__cga_findProgram = function(programText, alt, timeText){
          const targets = Array.from(document.querySelectorAll('section,article,div,li,tr'));
          let best=null, bestS=0;
          for (const el of targets){
            const txt = el.innerText||'';
            let s=score(txt, programText);
            (alt||[]).forEach(a=>{ s=Math.max(s,score(txt,a)); });
            if (timeText) s += 0.1 * score(txt,timeText);
            if (s > bestS){ bestS=s; best=el; }
          }
          if (bestS < 0.65) return { ok:false, score:bestS };
          best.setAttribute('data-cga-target','1');
          return { ok:true, score:bestS };
        };
      })();
    `;
    await act({ type:'evaluate', script: fuzzy });

    const findings:any[] = [];
    for (const m of (mappings||[])) {
      const child = (children||[]).find((c:any)=>c.id===m.child_id);
      const childName = child?.name || '';
      for (const sid2 of (m.session_ids||[])) {
        const sess = (sessions||[]).find((x:any)=>x.id===sid2);
        const loc = (sess?.site_locator as any) || {};
        const want = loc.program_text || sess?.title || '';
        const timeText = loc.time_text || '';
        const alt = (loc.alt_texts||[]) as string[];

        const { result } = await act({ type:'evaluate', script: `
          (function(programText, alt, timeText){ return window.__cga_findProgram(programText, alt, timeText); })(${JSON.stringify(want)}, ${JSON.stringify(alt)}, ${JSON.stringify(timeText)});
        `});
        findings.push({ childName, sessionId:sid2, programText:want, timeText, score: result?.score || 0, ok: !!result?.ok });
        log('match', { childName, want, timeText, ok: !!result?.ok, score: result?.score });
        const s = await snap(`match_${childName.replace(/\s+/g,'_')}_${sid2}`);
      }
    }

    return new Response(JSON.stringify({ success:true, session_id:sid, screenshots:[s1,s2,s3,s4], findings, logs }), { headers: H });
  } catch (e:any) {
    return new Response(JSON.stringify({ success:false, message:e?.message||'error' }), { headers: H, status:500 });
  }
});