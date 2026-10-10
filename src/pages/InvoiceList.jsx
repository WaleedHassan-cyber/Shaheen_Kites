import { useEffect, useState } from 'react';
import { Download, Eye, Loader2, Search, Trash2, X } from 'lucide-react';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fmtDate, money } from '../utils/format';
import { useDownloadPdf } from '../utils/useDownloadPdf';
import { Skeleton, TableSkeleton } from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';

const stamp = (d) => new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const state = (inv) => (inv.isDeleted ? 'deleted' : inv.status);

function InvoiceDetail({ invoice: inv, onClose, onDelete, deleting }) {
  const { user } = useAuth();
  const admin = user.role === 'admin';
  const [src, setSrc] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const { download, busyId } = useDownloadPdf();

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // The server checks who is asking, then returns a signed Cloudinary link for the image.
  useEffect(() => {
    if (inv.paymentProof?.publicId) {
      api.get(`/invoices/${inv._id}/proof`).then((r) => setSrc(r.data.url)).catch(() => {});
    }
  }, [inv]);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/50 p-0 animate-fade sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Invoice ${inv.invoiceNo}`} className="card animate-sheet max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-b-none p-5 sm:rounded-b-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">{inv.invoiceNo} {inv.isDeleted && <StatusBadge status="deleted" />}</h2>
            <p className="text-sm text-ink/60">{fmtDate(inv.orderDate)} · by {inv.createdBy?.name || inv.createdByName}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="btn-ghost !p-2"><X size={16} /></button>
        </div>

        {inv.isDeleted && <p className="mb-4 rounded-lg bg-ink/5 px-3 py-2 text-sm">Deleted by {inv.deletedByName} on {stamp(inv.deletedAt)}. The kites went back to stock and this invoice is not counted in any total.</p>}

        <p className="font-semibold">{inv.customer.name}</p>
        <p className="mb-4 text-sm text-ink/60">{inv.customer.phone || 'No phone'}</p>

        <div className="overflow-x-auto rounded-xl border border-ink/10">
          <table className="w-full">
            <thead className="bg-sky"><tr><th className="th">Item</th><th className="th text-right">Price</th><th className="th text-right">Qty</th><th className="th text-right">Total</th></tr></thead>
            <tbody className="divide-y divide-ink/10">
              {inv.items.map((i) => (
                <tr key={i.product}>
                  <td className="td">{i.name}</td>
                  <td className="td text-right">{money(i.unitPrice)}{admin && i.officialPrice !== undefined && i.unitPrice !== i.officialPrice && <div className="text-xs text-ink/50">Official {money(i.officialPrice)}</div>}</td>
                  <td className="td text-right">{i.quantity}</td>
                  <td className="td text-right">{money(i.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(inv.subtotal)}</dd></div>
          {inv.discountAmount > 0 && <div className="flex justify-between"><dt>Discount{inv.discountType === 'percent' ? ` (${inv.discountValue}%)` : ''}</dt><dd>- {money(inv.discountAmount)}</dd></div>}
          <div className="flex justify-between font-bold"><dt>Grand total</dt><dd>{money(inv.grandTotal)}</dd></div>
          <div className="flex justify-between text-leaf"><dt>Paid</dt><dd>{money(inv.amountPaid)}</dd></div>
          <div className={`flex justify-between font-bold ${inv.balance > 0 ? 'text-kred' : 'text-leaf'}`}><dt>Balance due</dt><dd>{money(inv.balance)}</dd></div>
        </dl>

        {admin && inv.createdByRole === 'staff' && (
          <dl className="mt-4 space-y-1 rounded-xl bg-sky p-4 text-sm">
            <div className="flex justify-between"><dt>Your amount (official prices)</dt><dd className="font-semibold">{money(inv.ownerAmount)}</dd></div>
            <div className="flex justify-between"><dt>{inv.createdBy?.name || inv.createdByName}'s profit</dt><dd className="font-semibold text-leaf">{money(inv.staffProfit)}</dd></div>
          </dl>
        )}

        {inv.paymentProof?.publicId && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold">Payment proof</h3>
            {!loaded && <Skeleton className="h-48 w-full" />}
            {src && <img src={src} alt="Payment proof" onLoad={() => setLoaded(true)} className={`max-h-80 rounded-lg border border-ink/10 ${loaded ? 'animate-fade' : 'hidden'}`} />}
          </div>
        )}

        {!inv.isDeleted && (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button className="btn-accent flex-1" disabled={busyId === inv._id} onClick={() => download(inv)}>
              {busyId === inv._id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Download PDF
            </button>
            {admin && (
              <button className="btn-ghost text-kred" disabled={deleting} onClick={() => onDelete(inv)}>
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete invoice
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvoiceList() {
  const { user } = useAuth();
  const toast = useToast();
  const admin = user.role === 'admin';
  const [data, setData] = useState({ invoices: [], total: 0, pages: 1 });
  const [f, setF] = useState({ search: '', status: '', from: '', to: '', staff: '', deleted: '' });
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [staff, setStaff] = useState([]);
  const [open, setOpen] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const { download, busyId } = useDownloadPdf();

  useEffect(() => { if (admin) api.get('/users').then((r) => setStaff(r.data)); }, [admin]);

  useEffect(() => {
    const t = setTimeout(() => {
      setFetching(true);
      api.get('/invoices', { params: { ...f, page, limit: 15 } })
        .then((r) => setData(r.data))
        .catch(() => {})
        .finally(() => { setLoading(false); setFetching(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [f, page, tick]);

  const upd = (k, v) => { setF((s) => ({ ...s, [k]: v })); setPage(1); };

  const remove = async (inv) => {
    const ok = window.confirm(`Delete ${inv.invoiceNo} (${inv.customer.name})?\n\nThe kites will be added back to your stock and this invoice's sales and profit will be removed from your totals. This cannot be undone.`);
    if (!ok) return;
    setDeleting(inv._id);
    try {
      await api.delete(`/invoices/${inv._id}`);
      toast.success(`${inv.invoiceNo} deleted. Stock restored`);
      setOpen(null);
      setTick((n) => n + 1);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setDeleting(null);
    }
  };

  const showingDeleted = f.deleted === 'true';

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="font-display text-2xl font-extrabold">{admin ? (showingDeleted ? 'Deleted invoices' : 'All invoices') : 'My invoices'}</h1>

      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search size={16} className="absolute left-3 top-2.5 text-ink/40" />
          <input aria-label="Search" className="input !pl-9" placeholder="Search invoice no, name or phone" value={f.search} onChange={(e) => upd('search', e.target.value)} />
        </div>
        <select aria-label="Status" className="input" value={f.status} onChange={(e) => upd('status', e.target.value)}>
          <option value="">All statuses</option><option value="paid">Paid</option><option value="partial">Partly paid</option><option value="unpaid">Unpaid</option>
        </select>
        {admin && (
          <select aria-label="Team member" className="input" value={f.staff} onChange={(e) => upd('staff', e.target.value)}>
            <option value="">All team members</option>
            {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        )}
        {admin && (
          <select aria-label="Show" className="input" value={f.deleted} onChange={(e) => upd('deleted', e.target.value)}>
            <option value="">Active invoices</option><option value="true">Deleted invoices</option>
          </select>
        )}
        <input aria-label="From date" type="date" className="input" value={f.from} onChange={(e) => upd('from', e.target.value)} />
        <input aria-label="To date" type="date" className="input" value={f.to} onChange={(e) => upd('to', e.target.value)} />
      </div>

      <div className={`card overflow-x-auto transition-opacity ${fetching && !loading ? 'opacity-60' : ''}`}>
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-ink/10">
            <tr><th className="th">Invoice</th><th className="th">Date</th><th className="th">Customer</th>{admin && <th className="th">Created by</th>}<th className="th text-right">Total</th><th className="th text-right">Balance</th><th className="th">Status</th><th className="th" /></tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {loading && <TableSkeleton rows={6} cols={admin ? 8 : 7} />}
            {!loading && data.invoices.map((inv, i) => (
              <tr key={inv._id} style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }} className={`animate-fade hover:bg-sky/60 ${inv.isDeleted ? 'text-ink/60' : ''}`}>
                <td className="td font-semibold">{inv.invoiceNo}</td>
                <td className="td">{fmtDate(inv.orderDate)}</td>
                <td className="td">{inv.customer.name}<div className="text-xs text-ink/50">{inv.customer.phone}</div></td>
                {admin && <td className="td">{inv.createdBy?.name || inv.createdByName}</td>}
                <td className="td text-right">{money(inv.grandTotal)}</td>
                <td className={`td text-right font-semibold ${inv.isDeleted ? '' : inv.balance > 0 ? 'text-kred' : 'text-leaf'}`}>{money(inv.balance)}</td>
                <td className="td"><StatusBadge status={state(inv)} /></td>
                <td className="td whitespace-nowrap text-right">
                  <button aria-label={`View ${inv.invoiceNo}`} className="btn-ghost !p-2" onClick={() => setOpen(inv)}><Eye size={16} /></button>{' '}
                  {!inv.isDeleted && (
                    <button aria-label={`Download ${inv.invoiceNo} PDF`} className="btn-ghost !p-2" disabled={busyId === inv._id} onClick={() => download(inv)}>{busyId === inv._id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}</button>
                  )}{' '}
                  {admin && !inv.isDeleted && (
                    <button aria-label={`Delete ${inv.invoiceNo}`} className="btn-ghost !p-2 text-kred" disabled={deleting === inv._id} onClick={() => remove(inv)}>{deleting === inv._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && data.invoices.length === 0 && <p className="p-8 text-center text-sm text-ink/60">{showingDeleted ? 'No deleted invoices.' : 'No invoices match these filters.'}</p>}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-ink/60">{data.total} invoice{data.total === 1 ? '' : 's'}</span>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {data.page || 1} of {data.pages}</span>
          <button className="btn-ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>

      {open && <InvoiceDetail invoice={open} onClose={() => setOpen(null)} onDelete={remove} deleting={deleting === open._id} />}
    </div>
  );
}
