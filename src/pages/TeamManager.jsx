import { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Loader2, UserPlus } from 'lucide-react';
import api, { errMsg } from '../api';
import { useToast } from '../context/ToastContext';
import { Skeleton } from '../components/Skeleton';
import { money } from '../utils/format';

// No look-alike characters (0/O, 1/l/I) so it is easy to read out or type.
const randomPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint32Array(8)), (n) => chars[n % chars.length]).join('');
};

export default function TeamManager() {
  const toast = useToast();
  const [team, setTeam] = useState(null);
  const [busy, setBusy] = useState(null);
  const [f, setF] = useState({ name: '', username: '', password: '' });
  const [creds, setCreds] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = () => api.get('/users').then((r) => setTeam(r.data));
  useEffect(() => { load().catch((e) => toast.error(errMsg(e))); }, []);

  const add = async (e) => {
    e.preventDefault();
    setBusy('add');
    try {
      await api.post('/users', f);
      setCreds({ name: f.name, username: f.username.toLowerCase().trim(), password: f.password });
      setCopied(false);
      setF({ name: '', username: '', password: '' });
      await load();
      toast.success('Account created');
    } catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(null); }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Username: ${creds.username}\nPassword: ${creds.password}`);
      setCopied(true);
      toast.success('Login details copied');
    } catch { toast.error('Could not copy. Select the text and copy it by hand'); }
  };

  const patch = async (u, body, okText) => {
    setBusy(u._id);
    try { await api.patch(`/users/${u._id}`, body); await load(); toast.success(okText); }
    catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(null); }
  };

  const resetPassword = (u) => {
    const password = window.prompt(`New password for ${u.name} (at least 6 characters)`, randomPassword());
    if (password) patch(u, { password }, `Password changed. New password: ${password}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="font-display text-2xl font-extrabold">Team</h1>

      {creds && (
        <div className="card animate-pop border-leaf/40 bg-leaf/5 p-5">
          <h2 className="font-semibold">{creds.name} can now sign in</h2>
          <p className="mb-3 text-sm text-ink/70">Send these two details to them. The password is shown only now, so copy it before you leave this page.</p>
          <dl className="grid grid-cols-[6rem_1fr] gap-y-1 rounded-lg bg-white p-3 font-mono text-sm">
            <dt className="text-ink/60">Username</dt><dd className="font-bold">{creds.username}</dd>
            <dt className="text-ink/60">Password</dt><dd className="font-bold">{creds.password}</dd>
          </dl>
          <div className="mt-3 flex gap-2">
            <button className="btn-primary" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy both'}</button>
            <button className="btn-ghost" onClick={() => setCreds(null)}>Done</button>
          </div>
        </div>
      )}

      <form onSubmit={add} className="card grid gap-3 p-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Add team member</h2>
        <div>
          <label className="label" htmlFor="tn">Full name</label>
          <input id="tn" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="tu">Username</label>
          <input id="tu" className="input" autoCapitalize="none" spellCheck={false} placeholder="e.g. bilal" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.replace(/\s/g, '') })} required />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="tp">Password</label>
          <div className="flex gap-2">
            <input id="tp" className="input font-mono" minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
            <button type="button" className="btn-ghost whitespace-nowrap" onClick={() => setF({ ...f, password: randomPassword() })}><KeyRound size={16} /> Generate</button>
          </div>
        </div>
        <button className="btn-accent sm:col-span-2" disabled={busy === 'add'}>{busy === 'add' ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} {busy === 'add' ? 'Creating…' : 'Create account'}</button>
      </form>

      <div className="card divide-y divide-ink/10">
        {team === null && [0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-4"><Skeleton className="h-5 w-40" /><Skeleton className="ml-auto h-9 w-44" /></div>
        ))}
        {team?.map((u) => (
          <div key={u._id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${u.isActive ? '' : 'opacity-60'}`}>
            <div className="min-w-[10rem] flex-1">
              <div className="font-semibold">{u.name}</div>
              <div className="text-xs text-ink/60">Username: {u.username} · {u.invoices} invoice{u.invoices === 1 ? '' : 's'}{u.isActive ? '' : ' · Access removed'}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-ink/60">Lifetime profit</div>
              <div className="font-display text-lg font-extrabold text-leaf">{money(u.profit)}</div>
            </div>
            <button className="btn-ghost" disabled={busy === u._id} onClick={() => resetPassword(u)}>Change password</button>
            <button className="btn-ghost" disabled={busy === u._id} onClick={() => patch(u, { isActive: !u.isActive }, u.isActive ? 'Access removed. Their invoices are kept' : 'Access restored')}>{u.isActive ? 'Remove access' : 'Restore access'}</button>
          </div>
        ))}
        {team && team.length === 0 && <p className="p-6 text-center text-sm text-ink/60">No team members yet. Add the first one above.</p>}
      </div>
    </div>
  );
}
