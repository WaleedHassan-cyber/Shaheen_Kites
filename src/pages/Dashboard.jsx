import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Boxes } from 'lucide-react';
import api, { errMsg } from '../api';
import { money } from '../utils/format';
import CountUp from '../components/CountUp';
import { Skeleton } from '../components/Skeleton';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);
const NAVY = '#0E2A47', YELLOW = '#FFC20E';
const PALETTE = [NAVY, YELLOW, '#D7263D', '#4A90C2', '#16803C', '#8A94A6'];

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-5" aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="card space-y-3 p-5"><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-32" /></div>)}</div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2"><Skeleton className="h-64 w-full" /></div>
        <div className="card p-5"><Skeleton className="h-64 w-full" /></div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/stats').then((r) => setS(r.data)).catch((e) => setError(errMsg(e))); }, []);
  if (error) return <p role="alert" className="text-kred">{error}</p>;
  if (!s) return <DashboardSkeleton />;

  const days = [...Array(14)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
  });
  const byDay = Object.fromEntries(s.daily.map((d) => [d._id, d]));

  const cards = [
    { label: 'Your revenue (official prices)', value: s.totals.revenue, tone: '' },
    { label: 'Team profit (kept by members)', value: s.totals.staffProfit, tone: 'text-leaf' },
    { label: 'Paid by customers', value: s.totals.paid, tone: '' },
    { label: 'Pending balances', value: s.totals.pending, tone: 'text-kred' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-end justify-between">
        <h1 className="font-display text-2xl font-extrabold">Dashboard</h1>
        <Link to="/invoices" className="text-sm font-semibold underline">{s.totals.count} invoices</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <div key={c.label} style={{ animationDelay: `${i * 80}ms` }} className="card animate-rise p-5">
            <div className="text-sm text-ink/60">{c.label}</div>
            <div className={`mt-1 font-display text-2xl font-extrabold md:text-3xl ${c.tone}`}><CountUp value={c.value} /></div>
          </div>
        ))}
      </div>
      <p className="-mt-2 text-xs text-ink/60">Your revenue + team profit = what customers were billed ({money(s.totals.billed)}). Deleted invoices are not counted anywhere.</p>

      <Link to="/admin/inventory" style={{ animationDelay: '280ms' }} className="card animate-rise flex flex-wrap items-center gap-x-6 gap-y-1 p-4 hover:bg-white/60">
        <Boxes size={20} />
        <span className="font-semibold">{s.stock.kites.toLocaleString('en-PK')} kites in stock</span>
        <span className="text-sm text-ink/70">{s.stock.sets.toLocaleString('en-PK')} pinna sets</span>
        {s.stock.low > 0 && <span className="text-sm font-semibold text-kred">{s.stock.low} item{s.stock.low === 1 ? '' : 's'} low or out</span>}
        <span className="ml-auto text-sm underline">Open inventory</span>
      </Link>

      <div className="grid gap-5 lg:grid-cols-3">
        <section style={{ animationDelay: '320ms' }} className="card animate-rise p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Last 14 days</h2>
          <Bar
            data={{
              labels: days.map((d) => d.slice(5)),
              datasets: [
                { label: 'Your revenue', data: days.map((d) => byDay[d]?.revenue || 0), backgroundColor: NAVY, borderRadius: 4 },
                { label: 'Team profit', data: days.map((d) => byDay[d]?.profit || 0), backgroundColor: YELLOW, borderRadius: 4 },
              ],
            }}
            options={{ responsive: true, animation: { duration: 900, easing: 'easeOutCubic' }, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }}
          />
        </section>

        <section style={{ animationDelay: '400ms' }} className="card animate-rise p-5">
          <h2 className="mb-3 font-semibold">Your revenue by item</h2>
          {s.byItem.length === 0 ? <p className="text-sm text-ink/60">No sales yet.</p> : (
            <Doughnut
              data={{ labels: s.byItem.map((i) => i._id), datasets: [{ data: s.byItem.map((i) => i.revenue), backgroundColor: PALETTE, borderWidth: 0 }] }}
              options={{ animation: { duration: 900 }, plugins: { legend: { position: 'bottom' } } }}
            />
          )}
        </section>
      </div>

      <section style={{ animationDelay: '480ms' }} className="card animate-rise overflow-x-auto">
        <h2 className="p-5 pb-2 font-semibold">Team profit (lifetime)</h2>
        <table className="w-full min-w-[640px]">
          <thead><tr><th className="th">Team member</th><th className="th text-right">Invoices</th><th className="th text-right">Billed to customers</th><th className="th text-right">Your share</th><th className="th text-right">Their profit</th><th className="th text-right">Pending</th></tr></thead>
          <tbody className="divide-y divide-ink/10">
            {s.byStaff.map((m) => (
              <tr key={m._id} className="hover:bg-sky/60">
                <td className="td font-semibold">{m.name || 'Removed user'}</td>
                <td className="td text-right">{m.invoices}</td>
                <td className="td text-right">{money(m.billed)}</td>
                <td className="td text-right">{money(m.ownerAmount)}</td>
                <td className="td text-right font-bold text-leaf">{money(m.profit)}</td>
                <td className="td text-right text-kred">{money(m.pending)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {s.byStaff.length === 0 && <p className="p-6 text-center text-sm text-ink/60">No team invoices yet.</p>}
      </section>
    </div>
  );
}
