import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Search, XCircle } from 'lucide-react';
import api from '../api';
import { BUSINESS } from '../config';
import { fmtDate, money } from '../utils/format';
import KiteLoader from '../components/KiteLoader';
import StatusBadge from '../components/StatusBadge';

// PUBLIC page (no login). A customer scans the QR on their invoice, or types the code, to check it is real.
export default function Verify() {
  const { code } = useParams();
  const nav = useNavigate();
  const [state, setState] = useState(code ? 'loading' : 'idle');
  const [d, setD] = useState(null);
  const [why, setWhy] = useState('');
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!code) { setState('idle'); setD(null); return; }
    setState('loading');
    api.get(`/verify/${encodeURIComponent(code)}`)
      .then((r) => {
        // A real answer is an object with an invoice number. Anything else (a web page, text)
        // means the address is not our server.
        if (typeof r.data !== 'object' || !r.data?.invoiceNo) {
          setWhy('The address answered with a web page, not our server. VITE_API_URL is probably wrong');
          return setState('error');
        }
        setD(r.data);
        setState('ok');
      })
      .catch((e) => {
        if (e.response?.status === 404) return setState('missing');
        // Says WHY it failed, so the owner can fix the setup quickly.
        const body = e.response?.data;
        const said = typeof body?.message === 'string' ? body.message : typeof body === 'string' ? 'a web page, not our server (VITE_API_URL is probably wrong)' : '';
        setWhy(!e.response ? 'No answer from the server (wrong server address, server is off, or the server is blocking this website)' : e.response.status === 429 ? 'Too many checks in a minute' : `Server error ${e.response.status}${said ? `. It said: ${said}` : ''}`);
        setState('error');
      });
  }, [code]);

  const submit = (e) => {
    e.preventDefault();
    const c = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c) nav(`/verify/${c}`);
  };

  const form = (
    <form onSubmit={submit} className="mt-6 border-t border-ink/10 pt-5">
      <label className="label" htmlFor="vc">{state === 'idle' ? 'Enter the code printed on the invoice' : 'Check another invoice'}</label>
      <div className="flex gap-2">
        <input id="vc" className="input font-mono uppercase" placeholder="XXXX-XXXX-XXXX" autoCapitalize="characters" autoComplete="off" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn-primary"><Search size={16} /> Check</button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen">
      <header className="bg-ink px-5 py-4">
        <div className="mx-auto max-w-lg font-display text-xl font-extrabold text-kite -skew-x-6">{BUSINESS.name}</div>
      </header>

      <main className="mx-auto max-w-lg p-4">
        <div className="card animate-rise mt-4 p-6" aria-live="polite">
          {state === 'idle' && (
            <>
              <h1 className="font-display text-2xl font-extrabold">Verify an invoice</h1>
              <p className="mt-1 text-sm text-ink/70">Scan the QR code on your invoice, or type its code below, to confirm it was really issued by {BUSINESS.name}.</p>
            </>
          )}

          {state === 'loading' && <KiteLoader label="Checking invoice…" />}

          {state === 'missing' && (
            <div className="text-center">
              <XCircle className="mx-auto text-kred" size={48} />
              <h1 className="mt-2 font-display text-2xl font-extrabold text-kred">No invoice found</h1>
              <p className="mt-2 text-sm text-ink/70">This code does not match any invoice we issued. It may be fake. Please contact us before paying: <strong>{BUSINESS.phone}</strong></p>
            </div>
          )}

          {state === 'error' && (
            <div role="alert" className="text-center">
              <p className="text-sm font-semibold text-kred">Could not check right now. Please try again in a minute.</p>
              <p className="mt-2 text-xs text-ink/50">Technical reason: {why}</p>
            </div>
          )}

          {state === 'ok' && d && (
            <>
              <div className="text-center">
                {d.cancelled ? <XCircle className="mx-auto text-kred" size={48} /> : <CheckCircle2 className="mx-auto text-leaf" size={48} />}
                <h1 className={`mt-2 font-display text-2xl font-extrabold ${d.cancelled ? 'text-kred' : 'text-leaf'}`}>{d.cancelled ? 'Cancelled invoice' : 'Genuine invoice'}</h1>
                <p className="text-sm text-ink/70">{d.cancelled ? 'This invoice was cancelled and is NOT valid.' : `Issued by ${BUSINESS.name}`}</p>
              </div>

              <dl className="mt-5 space-y-2 text-sm">
                {[['Invoice no', d.invoiceNo], ['Date', fmtDate(d.date)], ['Customer', d.customer], ['Handled by', d.handledBy]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4"><dt className="text-ink/60">{k}</dt><dd className="font-semibold">{v}</dd></div>
                ))}
              </dl>

              <ul className="mt-4 divide-y divide-ink/10 rounded-xl border border-ink/10 text-sm">
                {d.items.map((i) => <li key={i.name} className="flex justify-between px-3 py-2"><span>{i.name}</span><span className="font-semibold">× {i.quantity}</span></li>)}
              </ul>

              <dl className="mt-4 space-y-1 rounded-xl bg-sky p-4 text-sm">
                <div className="flex justify-between font-bold"><dt>Total bill</dt><dd>{money(d.grandTotal)}</dd></div>
                <div className="flex justify-between text-leaf"><dt>Paid</dt><dd>{money(d.amountPaid)}</dd></div>
                <div className={`flex justify-between font-bold ${d.balance > 0 ? 'text-kred' : 'text-leaf'}`}><dt>Remaining</dt><dd>{money(d.balance)}</dd></div>
              </dl>

              {!d.cancelled && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                  <StatusBadge status={d.status} />
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${d.deliveryStatus === 'delivered' ? 'bg-leaf/10 text-leaf' : 'bg-ink/10 text-ink/70'}`}>
                    {d.deliveryStatus === 'delivered' ? `Delivered on ${fmtDate(d.deliveredAt)}` : 'Not delivered yet'}
                  </span>
                </div>
              )}
              <p className="mt-4 text-xs text-ink/60">Compare these details with your paper invoice. If anything is different, the invoice is not genuine. Call {BUSINESS.phone}.</p>
            </>
          )}

          {state !== 'loading' && form}
        </div>
      </main>
    </div>
  );
}