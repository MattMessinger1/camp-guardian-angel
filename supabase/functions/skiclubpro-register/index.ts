import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { getDecryptedCredentials } from '../_shared/account-credentials.ts';

const H = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Content-Type':'application/json' };
const DRY_RUN = (Deno.env.get('SKICLUBPRO_DRY_RUN')||'false').toLowerCase()==='true';
const PREWARM_SECONDS = parseInt(Deno.env.get('PREWARM_SECONDS')||'50'); // start ~50s early
const WAIT_AFTER_PAY_MS = 20000;

async function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)); }

serve(async (req) => {
  if (req.method==='OPTIONS') return new Response(null, { headers: H });
  try{
    const { plan_id } = await req.json();
    if (!plan_id) return new Response(JSON.stringify({ success:false, message:'plan_id required' }), { headers:H, status:400 });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: plan } = await admin.from('registration_plans').select('*').eq('id', plan_id).single();
    if (!plan) return new Response(JSON.stringify({ success:false, message:'plan not found' }), { headers:H });

    const providerUrl = plan.provider_url || plan.detect_url || 'https://blackhawk.skiclubpro.team';
    const userId = plan.user_id;

    const { data: mappings } = await admin.from('plan_children_map').select('child_id, session_ids, priority').eq('plan_id', plan_id).order('priority');
    if (!mappings?.length) return new Response(JSON.stringify({ success:false, message:'no mappings' }), { headers:H });

    const sessIds = [...new Set(mappings.flatMap((m:any)=>m.session_ids||[]))];
    const { data: sessions } = await admin.from('sessions').select('id,title,site_locator').in('id', sessIds);
    const childIds = [...new Set(mappings.map((m:any)=>m.child_id))];
    const { data: children } = await admin.from('children').select('id,name').in('id', childIds);

    const creds = await getDecryptedCredentials({ userId, providerUrl });
    if (!creds?.email || !creds?.password) return new Response(JSON.stringify({ success:false, message:'missing credentials' }), { headers:H });

    const bbKey = Deno.env.get('BROWSERBASE_TOKEN')!;
    const mk = await fetch('https://api.browserbase.com/v1/sessions', { method:'POST', headers:{'Content-Type':'application/json','X-BB-API-Key':bbKey}, body: JSON.stringify({ browser_settings:{ headless:true }})});
    if (!mk.ok) throw new Error('Browserbase session create failed');
    const { id: sid } = await mk.json();

    async function act(body:any){ const r=await fetch(`https://api.browserbase.com/v1/sessions/${sid}/actions`,{method:'POST',headers:{'Content-Type':'application/json','X-BB-API-Key':bbKey},body:JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json();}
    async function shot(label:string){ try{ const b=await fetch(`https://api.browserbase.com/v1/sessions/${sid}/screenshot`,{headers:{'X-BB-API-Key':bbKey}}); return (await b.arrayBuffer()).byteLength; }catch{return 0;} }

    // PREWARM: login early, then idle right up to manual_open_at
    await act({ type:'goto', url: providerUrl });
    await act({ type:'wait_for_any', selectors:['input[type="email"]','input[name*="email"]'], timeout:15000 });
    await act({ type:'type', selector:'input[type="email"], input[name*="email"]', text:creds.email });
    await act({ type:'type', selector:'input[type="password"], input[name*="password"]', text:creds.password });
    await act({ type:'click_any', selectors:['button[type="submit"]','button:has-text("Login")','input[type="submit"]'] });
    await act({ type:'wait_network_idle', timeout:15000 });
    await shot('prewarm-login');

    // Wait until open time if now < manual_open_at
    if (plan.manual_open_at) {
      const now = Date.now();
      const target = new Date(plan.manual_open_at).getTime();
      const delta = target - now - PREWARM_SECONDS*1000;
      if (delta > 0) await sleep(delta);
    }

    // 1) Memberships (idempotent try)
    await act({ type:'click_any', selectors:['a:has-text("Memberships")','a:has-text("Membership")','nav >> text=Membership'] }).catch(()=>{});
    await act({ type:'wait_network_idle', timeout:8000 }).catch(()=>{});
    await act({ type:'click_any', selectors:['button:has-text("Add to Cart")','button:has-text("Add")','a:has-text("Add to Cart")'] }).catch(()=>{});
    await shot('membership');

    // 2) Register/Programs
    await act({ type:'click_any', selectors:['a:has-text("Register")','a:has-text("Programs")','nav >> text=Register'] });
    await act({ type:'wait_network_idle', timeout:12000 });
    await act({ type:'evaluate', script: `
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
    `});
    await shot('register');

    // 3) Add programs per child
    for (const m of (mappings||[])) {
      const child = (children||[]).find((c:any)=>c.id===m.child_id);
      const childName = child?.name || '';

      for (const sid2 of (m.session_ids||[])) {
        const sess = (sessions||[]).find((x:any)=>x.id===sid2);
        const loc = (sess?.site_locator as any) || {};
        const want = loc.program_text || sess?.title || '';
        const timeText = loc.time_text || '';
        const alt = (loc.alt_texts||[]) as string[];

        // Mark target block
        const { result } = await act({ type:'evaluate', script: `
          (function(programText, alt, timeText){ return window.__cga_findProgram(programText, alt, timeText); })(${JSON.stringify(want)}, ${JSON.stringify(alt)}, ${JSON.stringify(timeText)});
        `});
        if (!result?.ok) throw new Error('Program not found: '+want);

        if (!DRY_RUN) {
          // Click Register/Add
          await act({ type:'click_any', selectors:[
            '[data-cga-target] button:has-text("Register")',
            '[data-cga-target] button:has-text("Add to Cart")',
            '[data-cga-target] a:has-text("Register")',
            '[data-cga-target] a:has-text("Add")'
          ]});

          // Child pick
          await act({
            type:'click_or_select',
            candidates:[
              { type:'select', selector:'select[name*="child"], select[id*="child"]', value: childName },
              { type:'click_by_text', text: childName },
              { type:'radio_by_label', label: childName }
            ],
            timeout: 5000
          }).catch(()=>{ /* if only one child, sometimes auto-selected */ });

          // Confirm
          await act({ type:'click_any', selectors:['button:has-text("Add")','button:has-text("Confirm")','button:has-text("Continue")','button:has-text("OK")'] }).catch(()=>{});
          await act({ type:'wait_network_idle', timeout:6000 });
        }
        await shot(`added_${childName.replace(/\s+/g,'_')}_${sid2}`);
      }
    }

    // 4) Checkout
    await act({ type:'click_any', selectors:['a:has-text("Cart")','a:has-text("Checkout")','button:has-text("Checkout")'] });
    await act({ type:'wait_network_idle', timeout:15000 });
    await shot('checkout');

    if (!DRY_RUN) {
      // If saved card exists, site should present a "Pay/Complete" button.
      await act({ type:'click_any', selectors:['button:has-text("Pay")','button:has-text("Complete Order")','button:has-text("Checkout")'] }).catch(()=>{});
      await sleep(WAIT_AFTER_PAY_MS);
      await shot('after-pay');
    }

    return new Response(JSON.stringify({ success:true, session_id:sid, dry_run:DRY_RUN }), { headers:H });
  }catch(e:any){
    return new Response(JSON.stringify({ success:false, message:e?.message||'error' }), { headers:H, status:500 });
  }
});