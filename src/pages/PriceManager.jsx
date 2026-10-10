import { useEffect, useState } from 'react';
import { Check, Loader2, Plus } from 'lucide-react';
import api, { errMsg } from '../api';
import { money } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { Skeleton } from '../components/Skeleton';

export default function PriceManager() {
  const toast = useToast();
  const [products, setProducts] = useState(null);
  const [edits, setEdits] = useState({});
  const [nw, setNw] = useState({ name: '', price: '', unit: 'kite' });
  const [busy, setBusy] = useState(null);
  const [savedId, setSavedId] = useState(null);

  const load = () => api.get('/products').then((r) => setProducts(r.data));
  useEffect(() => { load().catch((e) => toast.error(errMsg(e))); }, []);

  const save = async (p, patch, okText) => {
    setBusy(p._id);
    try {
      await api.put(`/products/${p._id}`, patch);
      setEdits((e) => { const { [p._id]: _, ...rest } = e; return rest; });
      await load();
      setSavedId(p._id);
      setTimeout(() => setSavedId(null), 1500);
      toast.success(okText);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setBusy(null); }
  };

  const add = async (e) => {
    e.preventDefault();
    setBusy('add');
    try {
      await api.post('/products', nw);
      setNw({ name: '', price: '', unit: 'kite' });
      await load();
      toast.success(`${nw.name} added`);
    } catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(null); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Prices</h1>
        <p className="text-sm text-ink/60">New prices apply to new invoices. Existing invoices keep the price they were created with.</p>
      </div>

      <div className="card divide-y divide-ink/10">
        {products === null && [0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-4"><Skeleton className="h-5 w-32" /><Skeleton className="ml-auto h-9 w-48" /></div>
        ))}
        {products?.map((p) => {
          const dirty = edits[p._id] !== undefined && Number(edits[p._id]) !== p.price;
          const working = busy === p._id;
          return (
            <div key={p._id} className={`flex flex-wrap items-center gap-3 px-4 py-3 transition-colors duration-700 ${savedId === p._id ? 'bg-leaf/10' : ''} ${p.isActive ? '' : 'opacity-60'}`}>
              <div className="min-w-[8rem] flex-1">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-ink/60">Now {money(p.price)} / {p.unit}</div>
              </div>
              <label className="sr-only" htmlFor={`pr-${p._id}`}>Price for {p.name}</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-ink/60">Rs.</span>
                <input id={`pr-${p._id}`} inputMode="numeric" className="input !w-28" value={edits[p._id] ?? p.price} onChange={(e) => setEdits({ ...edits, [p._id]: e.target.value.replace(/\D/g, '') })} />
              </div>
              <button className="btn-primary" disabled={!dirty || working} onClick={() => save(p, { price: Number(edits[p._id]) }, `${p.name} price saved`)}>
                {working ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save
              </button>
              <button className="btn-ghost" disabled={working} onClick={() => save(p, { isActive: !p.isActive }, p.isActive ? `${p.name} hidden from staff` : `${p.name} is visible again`)}>{p.isActive ? 'Hide' : 'Show'}</button>
            </div>
          );
        })}
      </div>

      <form onSubmit={add} className="card grid gap-3 p-4 sm:grid-cols-[1fr_8rem_6rem_auto]">
        <input aria-label="Item name" className="input" placeholder="New item name" value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} required />
        <input aria-label="Price" inputMode="numeric" className="input" placeholder="Price" value={nw.price} onChange={(e) => setNw({ ...nw, price: e.target.value.replace(/\D/g, '') })} required />
        <select aria-label="Unit" className="input" value={nw.unit} onChange={(e) => setNw({ ...nw, unit: e.target.value })}><option value="kite">kite</option><option value="set">set</option></select>
        <button className="btn-accent" disabled={busy === 'add'}>{busy === 'add' ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add item</button>
      </form>
    </div>
  );
}
