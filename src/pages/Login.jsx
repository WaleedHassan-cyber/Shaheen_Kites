import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api';
import { BUSINESS } from '../config';

export default function Login() {
  const { user, login } = useAuth();
  const from = useLocation().state?.from;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shakes, setShakes] = useState(0);

  if (user) return <Navigate to={from || '/'} replace />; // '/' sends the owner and team members to their own start page

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(errMsg(err));
      setShakes((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="flex flex-col justify-end bg-ink p-8 text-white md:p-14">
        <svg viewBox="0 0 120 150" className="mb-6 w-24 animate-bob" aria-hidden="true">
          <polygon points="60,4 116,60 60,122 4,60" fill="#FFC20E" />
          <polygon points="60,4 116,60 60,60" fill="#D7263D" />
          <path d="M60 122 C50 134 70 140 58 148" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
        <h1 className="font-display text-4xl font-extrabold leading-none text-kite -skew-x-6 md:text-6xl">{BUSINESS.name}</h1>
        <p className="mt-4 max-w-sm text-white/75">Create invoices, track payments and keep every order in one place.</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="card animate-rise w-full max-w-sm space-y-4 p-6">
          <h2 className="font-display text-2xl font-extrabold">Sign in</h2>
          <div>
            <label className="label" htmlFor="username">Username</label>
            <input id="username" type="text" required autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" required autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p key={shakes} role="alert" className="animate-shake rounded-lg bg-kred/10 px-3 py-2 text-sm text-kred">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />} {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-xs text-ink/60">Your username and password are given to you by the owner.</p>
        </form>
      </div>
    </div>
  );
}