import { useEffect, useState } from 'react';
import { Loader2, PackagePlus, Pencil } from 'lucide-react';
import api, { errMsg } from '../api';
import { useToast } from '../context/ToastContext';
import { LOW_STOCK } from '../config';
import { Skeleton } from '../components/Skeleton';

const when = (d) => new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const reason = (m) =>
  m.type === 'add' ? 'Stock added' : m.type === 'sale' ? `Sold on ${m.invoiceNo}` : m.type === 'void' ? `${m.invoiceNo} deleted, kites returned` : 'Count corrected';

function StockBadge({ n }) {
  if (n <= 0) return <span className="rounded-full bg-kred/10 px-2.5 py-0.5 text-xs font-semibold text-kred">Out of stock</span>;
  if (n <= LOW_STOCK) return <span className="rounded-full bg-kite/25 px-2.5 py-0.5 text-xs font-semibold">Low</span>;
  return <span className="rounded-full bg-leaf/10 px-2.5 py-0.5 text-xs font-semibold text-leaf">In stock</span>;
}

export default function Inventory() {
  const toast = useToast();
  const [products, setProducts] = useState(null);
  const [moves, setMoves] = useState(null);
  const [add, setAdd] = useState({});
  const [busy, setBusy] = useState(null);

  const load = () =>
    Promise.all([api.get('/products'), api.get('/inventory/movements')]).then(([p, m]) => { setProducts(p.data); setMoves(m.data); });
  useEffect(() => { load().catch((e) => toast.error(errMsg(e))); }, []);

  const run = async (id, fn, okText) => {
    setBusy(id);
    try { await fn(); await load(); toast.success(okText); }
    catch (e) { toast.error(errMsg(e)); }
    finally { setBusy(null); }
  };

  const addStock = (p) => {
    const qty = parseInt(add[p._id]);
    if (!qty || qty < 1) return toast.error('Enter how many to add');
    run(p._id, async () => { await api.post(`/inventory/${p._id}/add`, { quantity: qty }); setAdd((a) => ({ ...a, [p._id]: '' })); }, `${qty} ${p.name} added to stock`);
  };

  const correct = (p) => {
    const v = window.prompt(`How many ${p.name} do you have right now? (counted by hand)`, p.stock || 0);
    if (v === null) return;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) return toast.error('Enter a whole number, 0 or more');
    run(p._id, () => api.post(`/inventory/${p._id}/adjust`, { stock: n }), `${p.name} count set to ${n}`);
  };

  const sum = (unit) => (products || []).filter((p) => p.unit === unit).reduce((s, p) => s + (p.stock || 0), 0);
  const needs = (products || []).filter((p) => p.isActive && (p.stock || 0) <= LOW_STOCK).length;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Inventory</h1>
        <p className="text-sm text-ink/60">Stock goes down on every invoice and comes back if you delete one. Add new kites here when you buy them.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[['Kites in stock', products && sum('kite'), ''], ['Pinna sets in stock', products && sum('set'), ''], ['Need restocking', products && needs, needs ? 'text-kred' : '']].map(([label, v, tone], i) => (
          <div key={label} style={{ animationDelay: `${i * 70}ms` }} className="card animate-rise p-5">
            <div className="text-sm text-ink/60">{label}</div>
            {v === null ? <Skeleton className="mt-2 h-9 w-24" /> : <div className={`mt-1 font-display text-3xl font-extrabold ${tone}`}>{Number(v).toLocaleString('en-PK')}</div>}
          </div>
        ))}
      </div>

      <section className="card divide-y divide-ink/10">
        {products === null && [0, 1, 2, 3].map((i) => <div key={i} className="flex items-center gap-3 px-4 py-4"><Skeleton className="h-5 w-32" /><Skeleton className="ml-auto h-9 w-56" /></div>)}
        {products?.map((p) => (
          <div key={p._id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${p.isActive ? '' : 'opacity-60'}`}>
            <div className="min-w-[8rem] flex-1">
              <div className="font-semibold">{p.name}{!p.isActive && <span className="ml-2 text-xs font-normal text-ink/60">(hidden)</span>}</div>
              <div className="mt-0.5"><StockBadge n={p.stock || 0} /></div>
            </div>
            <div className="w-24 text-right">
              <div className="font-display text-2xl font-extrabold">{(p.stock || 0).toLocaleString('en-PK')}</div>
              <div className="text-xs text-ink/60">{p.unit === 'set' ? 'sets' : 'kites'}</div>
            </div>
            <div className="flex items-center gap-1">
              <label className="sr-only" htmlFor={`add-${p._id}`}>Add {p.name}</label>
              <input id={`add-${p._id}`} inputMode="numeric" placeholder="Add" className="input !w-24" value={add[p._id] || ''} onChange={(e) => setAdd({ ...add, [p._id]: e.target.value.replace(/\D/g, '') })} onKeyDown={(e) => e.key === 'Enter' && addStock(p)} />
              <button className="btn-primary" disabled={busy === p._id} onClick={() => addStock(p)}>
                {busy === p._id ? <Loader2 size={16} className="animate-spin" /> : <PackagePlus size={16} />} Add stock
              </button>
            </div>
            <button className="btn-ghost" disabled={busy === p._id} onClick={() => correct(p)} title="Set the exact count after counting by hand"><Pencil size={16} /> Correct</button>
          </div>
        ))}
      </section>

      <section className="card overflow-x-auto">
        <h2 className="p-5 pb-2 font-semibold">Stock history</h2>
        <table className="w-full min-w-[560px]">
          <thead><tr><th className="th">When</th><th className="th">Item</th><th className="th text-right">Change</th><th className="th">Reason</th><th className="th">By</th></tr></thead>
          <tbody className="divide-y divide-ink/10">
            {moves?.map((m) => (
              <tr key={m._id}>
                <td className="td whitespace-nowrap text-ink/70">{when(m.createdAt)}</td>
                <td className="td font-semibold">{m.productName}</td>
                <td className={`td text-right font-semibold ${m.change > 0 ? 'text-leaf' : 'text-kred'}`}>{m.change > 0 ? '+' : ''}{m.change}</td>
                <td className="td">{reason(m)}</td>
                <td className="td text-ink/70">{m.byName}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {moves && moves.length === 0 && <p className="p-6 text-center text-sm text-ink/60">No stock changes yet. Add your first stock above.</p>}
      </section>
    </div>
  );
}
