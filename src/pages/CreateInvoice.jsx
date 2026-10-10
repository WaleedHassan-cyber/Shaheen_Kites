import { useEffect, useState } from 'react';
import { Download, FilePlus2, Loader2, Minus, Plus, Upload } from 'lucide-react';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import { calcTotals, money, todayISO } from '../utils/format';
import { useDownloadPdf } from '../utils/useDownloadPdf';
import { LOW_STOCK } from '../config';
import { Skeleton } from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';

const blank = { customerName: '', customerPhone: '', orderDate: todayISO() };
const PROOF_ERROR = 'Upload the payment proof (screenshot or receipt) before saving';

export default function CreateInvoice() {
  const { user } = useAuth();
  const strict = user.role !== 'admin'; // team members cannot sell below the official price
  const [products, setProducts] = useState(null);
  const { download, busyId } = useDownloadPdf();
  const list = products || [];
  const [qty, setQty] = useState({});
  const [prices, setPrices] = useState({}); // price typed by the team member, per product
  const [form, setForm] = useState(blank);
  const [discount, setDiscount] = useState({ type: 'flat', value: '' });
  const [paid, setPaid] = useState('');
  const [proof, setProof] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  const loadProducts = () => api.get('/products').then((r) => setProducts(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { loadProducts(); }, []);

  useEffect(() => {
    if (!proof) return setPreview(null);
    const url = URL.createObjectURL(proof);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [proof]);

  const stockOf = (p) => p.stock || 0;
  const setQ = (p, v) => setQty((q) => ({ ...q, [p._id]: Math.max(0, Math.min(stockOf(p), 9999, parseInt(v) || 0)) }));
  const priceOf = (p) => (prices[p._id] === undefined ? p.price : Number(prices[p._id]) || 0);
  const isLow = (p) => strict && priceOf(p) < p.price;
  const resetPrice = (id) => setPrices(({ [id]: _, ...rest }) => rest);

  const lines = list.filter((p) => qty[p._id] > 0).map((p) => ({ ...p, unitPrice: priceOf(p), quantity: qty[p._id], lineTotal: priceOf(p) * qty[p._id] }));
  const t = calcTotals(lines, discount.type, Number(discount.value) || 0, Number(paid) || 0);
  // Team members can't discount below the official total. The most they can give is their own profit on the sale.
  const maxDiscount = t.subtotal - lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const rawDiscount = discount.type === 'percent' ? Math.round((t.subtotal * (Number(discount.value) || 0)) / 100) : Number(discount.value) || 0;
  const discountTooHigh = strict && lines.length > 0 && rawDiscount > maxDiscount;

  const reset = () => {
    setForm({ ...blank, orderDate: todayISO() });
    loadProducts();
    setQty({}); setPrices({}); setDiscount({ type: 'flat', value: '' }); setPaid(''); setProof(null); setError(''); setCreated(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.customerName.trim()) return setError('Enter the customer name');
    if (lines.length === 0) return setError('Add at least one item');
    const low = lines.find((l) => isLow(l));
    if (low) return setError(`${low.name} cannot be sold below ${money(low.price)}`);
    if (discountTooHigh) return setError(`Discount is too high. The most you can give on this sale is ${money(maxDiscount)}`);
    if ((Number(paid) || 0) > t.grandTotal) return setError('Amount paid cannot be more than the grand total');
    if (!proof) return setError(PROOF_ERROR);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append('items', JSON.stringify(lines.map((l) => ({ productId: l._id, quantity: l.quantity, unitPrice: l.unitPrice }))));
    fd.append('discountType', discount.type);
    fd.append('discountValue', discount.value || 0);
    fd.append('amountPaid', paid || 0);
    fd.append('paymentProof', proof);

    setSaving(true);
    try {
      const { data } = await api.post('/invoices', fd);
      setCreated(data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <div className="card animate-pop mx-auto mt-6 max-w-lg space-y-4 p-6 text-center">
        <svg viewBox="0 0 60 60" className="mx-auto w-16" aria-hidden="true">
          <circle className="draw-circle" cx="30" cy="30" r="26" fill="none" stroke="#16803C" strokeWidth="3" strokeLinecap="round" transform="rotate(-90 30 30)" />
          <path className="draw-check" d="M18 31 l8 8 l16 -17" fill="none" stroke="#16803C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1 className="font-display text-2xl font-extrabold">Invoice {created.invoiceNo} saved</h1>
        <div className="flex items-center justify-center gap-3 text-sm">
          <span>{created.customer.name}</span>·<span className="font-semibold">{money(created.grandTotal)}</span>·<StatusBadge status={created.status} />
        </div>
        {created.balance > 0 && <p className="font-semibold text-kred">Balance due: {money(created.balance)}</p>}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button className="btn-accent" disabled={busyId === created._id} onClick={() => download(created)}>
            {busyId === created._id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Download Invoice PDF
          </button>
          <button className="btn-ghost" onClick={reset}><FilePlus2 size={16} /> Create another</button>
        </div>
      </div>
    );
  }

  const proofErr = error === PROOF_ERROR;

  return (
    <form onSubmit={submit} className="mx-auto max-w-5xl space-y-5">
      <h1 className="font-display text-2xl font-extrabold">New invoice</h1>

      <section className="card grid gap-4 p-5 md:grid-cols-3">
        <div className="md:col-span-1">
          <label className="label" htmlFor="cn">Customer name</label>
          <input id="cn" className="input" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="cp">Phone (optional)</label>
          <input id="cp" type="tel" className="input" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="od">Order date</label>
          <input id="od" type="date" className="input" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} required />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-5">
        <section className="card divide-y divide-ink/10 lg:col-span-3">
          <div className="p-4">
            <h2 className="font-semibold">Items</h2>
            {strict && <p className="text-xs text-ink/60">You can raise the price of an item, but not go below the official price.</p>}
          </div>
          {products === null && [0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4"><Skeleton className="h-5 w-32" /><Skeleton className="ml-auto h-9 w-36" /></div>
          ))}
          {list.map((p, i) => (
            <div key={p._id} style={{ animationDelay: `${i * 40}ms` }} className="animate-rise flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-[8rem] flex-1">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-ink/60">{strict ? 'Minimum' : 'Official'} {money(p.price)} / {p.unit} · <span className={stockOf(p) === 0 ? 'font-semibold text-kred' : stockOf(p) <= LOW_STOCK ? 'font-semibold text-ink' : ''}>{stockOf(p) === 0 ? 'Out of stock' : `${stockOf(p)} in stock`}</span></div>
              </div>
              <div>
                <label className="sr-only" htmlFor={`pr-${p._id}`}>Price for {p.name}</label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-ink/60">Rs.</span>
                  <input
                    id={`pr-${p._id}`}
                    inputMode="numeric"
                    aria-invalid={isLow(p)}
                    className={`input !w-24 ${isLow(p) ? '!border-kred !ring-kred' : ''}`}
                    value={prices[p._id] ?? p.price}
                    onChange={(e) => setPrices({ ...prices, [p._id]: e.target.value.replace(/\D/g, '') })}
                    onBlur={() => prices[p._id] === '' && resetPrice(p._id)}
                  />
                </div>
                {isLow(p) && <p className="mt-1 text-xs font-semibold text-kred">Minimum {money(p.price)}</p>}
              </div>
              <div className="flex items-center gap-1">
                <button type="button" aria-label={`Less ${p.name}`} className="btn-ghost !p-2" disabled={stockOf(p) === 0} onClick={() => setQ(p, (qty[p._id] || 0) - 1)}><Minus size={14} /></button>
                <input aria-label={`${p.name} quantity`} inputMode="numeric" className="input !w-16 text-center" disabled={stockOf(p) === 0} value={qty[p._id] || ''} placeholder="0" onChange={(e) => setQ(p, e.target.value)} />
                <button type="button" aria-label={`More ${p.name}`} className="btn-ghost !p-2" disabled={stockOf(p) === 0 || (qty[p._id] || 0) >= stockOf(p)} onClick={() => setQ(p, (qty[p._id] || 0) + 1)}><Plus size={14} /></button>
              </div>
              <div key={`${qty[p._id] || 0}-${priceOf(p)}`} className="animate-pop w-24 text-right text-sm font-semibold">{qty[p._id] > 0 ? money(priceOf(p) * qty[p._id]) : ''}</div>
            </div>
          ))}
          {products && products.length === 0 && <p className="p-4 text-sm text-ink/60">No products yet. Ask the owner to add prices.</p>}
        </section>

        <section className="card space-y-4 p-5 lg:col-span-2">
          <div>
            <label className="label" htmlFor="dv">Discount</label>
            <div className="flex gap-2">
              <input id="dv" inputMode="decimal" className="input" placeholder="0" value={discount.value} onChange={(e) => setDiscount({ ...discount, value: e.target.value.replace(/[^\d.]/g, '') })} />
              <select aria-label="Discount type" className="input !w-28" value={discount.type} onChange={(e) => setDiscount({ ...discount, type: e.target.value })}>
                <option value="flat">Rs.</option>
                <option value="percent">%</option>
              </select>
            </div>
            {discountTooHigh && <p className="mt-1 text-xs font-semibold text-kred">Too high. The most you can give on this sale is {money(maxDiscount)}.</p>}
          </div>

          <dl className="space-y-1.5 rounded-xl bg-sky p-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd key={t.subtotal} className="animate-pop">{money(t.subtotal)}</dd></div>
            {t.discountAmount > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>- {money(t.discountAmount)}</dd></div>}
            <div className="flex justify-between border-t border-ink/15 pt-2 text-base font-bold"><dt>Grand total</dt><dd key={t.grandTotal} className="animate-pop">{money(t.grandTotal)}</dd></div>
          </dl>

          <div>
            <label className="label" htmlFor="paid">Amount paid</label>
            <div className="flex gap-2">
              <input id="paid" inputMode="numeric" className="input" placeholder="0" value={paid} onChange={(e) => setPaid(e.target.value.replace(/\D/g, ''))} />
              <button type="button" className="btn-ghost whitespace-nowrap" onClick={() => setPaid(String(t.grandTotal))} disabled={!t.grandTotal}>Paid in full</button>
            </div>
            <p className={`mt-2 text-sm font-semibold ${t.balance > 0 ? 'text-kred' : 'text-leaf'}`}>Remaining balance: {money(Math.max(t.balance, 0))}</p>
          </div>

          <div>
            <span className="label">Payment proof <span className="text-kred">(required)</span></span>
            <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm hover:bg-sky ${proofErr ? 'border-kred bg-kred/5' : 'border-ink/30'}`}>
              <Upload size={16} /> {proof ? proof.name : 'Choose screenshot or receipt'}
              <input type="file" accept="image/jpeg,image/png,image/webp" aria-required="true" className="sr-only" onChange={(e) => setProof(e.target.files[0] || null)} />
            </label>
            {preview && <img src={preview} alt="Payment proof preview" className="animate-pop mt-2 max-h-40 rounded-lg border border-ink/10" />}
          </div>
        </section>
      </div>

      {error && <p key={error} role="alert" className="animate-shake rounded-lg bg-kred/10 px-4 py-3 text-sm font-semibold text-kred">{error}</p>}
      <button className="btn-primary w-full md:w-auto" disabled={saving}>
        {saving && <Loader2 size={16} className="animate-spin" />} {saving ? 'Saving invoice…' : 'Save invoice'}
      </button>
    </form>
  );
}
