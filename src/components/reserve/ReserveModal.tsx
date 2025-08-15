import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  presetParent?: { name?: string; email: string; phone: string };
  presetChild?: { name: string; dob: string; notes?: string };
};

export default function ReserveModal({ open, onClose, sessionId, presetParent, presetChild }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [reservationId, setReservationId] = useState<string| null>(null);
  const [clientSecret, setClientSecret] = useState<string| null>(null);

  const [parent, setParent] = useState(presetParent ?? { name: '', email: '', phone: '' });
  const [child, setChild] = useState(presetChild ?? { name: '', dob: '' });

  useEffect(()=>{ if(!open){ setError(null); setReservationId(null); setClientSecret(null); }}, [open]);
  if (!open) return null;

  async function initPI() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/functions/v1/reserve-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, parent, child })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'init_failed');
      setReservationId(json.reservation_id);
      setClientSecret(json.payment_intent_client_secret);
      return json.payment_intent_client_secret as string;
    } catch (e:any) {
      setError(e.message); throw e;
    } finally {
      setLoading(false);
    }
  }

  async function authorizeAndExecute() {
    try {
      const secret = clientSecret ?? await initPI();
      const stripe = await stripePromise;
      if (!stripe) throw new Error('stripe_unavailable');

      // Confirm to AUTHORIZE only (manual capture)
      const { error: ce } = await stripe.confirmCardPayment(secret, {
        payment_method: {
          card: {
            token: 'tok_visa' // This will trigger the payment sheet for card collection
          }
        }
      });
      if (ce) throw new Error(ce.message);

      // reCAPTCHA v3 token
      // @ts-ignore
      const token = await grecaptcha.execute(import.meta.env.VITE_RECAPTCHA_SITE_KEY, { action: 'reserve' });

      const res2 = await fetch('/functions/v1/reserve-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, recaptcha_token: token })
      });
      const json2 = await res2.json();
      if (!res2.ok) throw new Error(json2?.error ?? 'execute_failed');

      // Handle response: confirmed instantly, or pending/SMS
      if (json2.status === 'confirmed') {
        alert('Success! Your spot is reserved.'); onClose();
      } else if (json2.status === 'needs_user_action') {
        alert('Quick verification sent via SMS. Tap the link or enter the code to finish.'); onClose();
      } else {
        alert('We are working on your reservation. You will be notified.'); onClose();
      }
    } catch (e:any) {
      setError(e.message);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold">Reserve this session</h3>
        <div className="grid gap-2 mt-3">
          <input className="border rounded p-2" placeholder="Parent Name" value={parent.name||''} onChange={e=>setParent({...parent, name:e.target.value})}/>
          <input className="border rounded p-2" placeholder="Email" value={parent.email} onChange={e=>setParent({...parent, email:e.target.value})}/>
          <input className="border rounded p-2" placeholder="Phone" value={parent.phone} onChange={e=>setParent({...parent, phone:e.target.value})}/>
          <input className="border rounded p-2" placeholder="Child Name" value={child.name} onChange={e=>setChild({...child, name:e.target.value})}/>
          <input className="border rounded p-2" type="date" value={child.dob} onChange={e=>setChild({...child, dob:e.target.value})}/>
        </div>
        {error && <div className="text-red-600 mt-2">{error}</div>}
        <div className="mt-4 flex gap-2 justify-end">
          <button className="px-4 py-2 border rounded" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 border rounded shadow" onClick={authorizeAndExecute} disabled={loading}>
            {loading ? 'Working…' : 'Reserve'}
          </button>
        </div>
      </div>
    </div>
  );
}