import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function Verify() {
  const params = new URLSearchParams(location.search);
  const rid = params.get('rid') || '';
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke('sms-verify', {
        body: { reservation_id: rid, code }
      });
      
      if (error) {
        setMsg(error.message || 'Failed');
      } else {
        setMsg('Verified! We\'re finalizing your signup.');
      }
    } catch (err: any) {
      setMsg(err.message || 'Failed to verify');
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold">Verify your reservation</h1>
      <p className="mt-2 text-sm opacity-80">Enter the 6-digit code we just texted you.</p>
      <input 
        className="mt-4 border rounded p-2 w-full text-center text-lg tracking-widest"
        value={code} 
        onChange={e => setCode(e.target.value)} 
        maxLength={6} 
        placeholder="••••••" 
      />
      <button 
        className="mt-3 px-4 py-2 border rounded w-full bg-primary text-primary-foreground hover:bg-primary/90" 
        onClick={submit}
      >
        Submit
      </button>
      {msg && <div className="mt-3 p-2 rounded bg-muted text-sm">{msg}</div>}
    </div>
  );
}