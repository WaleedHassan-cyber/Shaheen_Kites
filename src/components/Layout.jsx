import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Boxes, FilePlus2, ReceiptText, LayoutDashboard, ShieldCheck, Tags, Users, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BUSINESS } from '../config';

export default function Layout() {
  const { user, logout } = useAuth();
  const admin = user.role === 'admin';
  const { pathname } = useLocation();

  const links = [
    ...(admin ? [{ to: '/admin', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, end: true }] : []),
    { to: '/new', label: 'New invoice', short: 'New', icon: FilePlus2 },
    { to: '/invoices', label: admin ? 'All invoices' : 'My invoices', short: admin ? 'All' : 'Mine', icon: ReceiptText },
    ...(!admin ? [{ to: '/verify', label: 'Verify invoice', short: 'Verify', icon: ShieldCheck }] : []),
    ...(admin
      ? [
          { to: '/admin/inventory', label: 'Inventory', short: 'Stock', icon: Boxes },
          { to: '/admin/prices', label: 'Prices', short: 'Prices', icon: Tags },
          { to: '/admin/team', label: 'Team', short: 'Team', icon: Users },
        ]
      : []),
  ];

  const side = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${isActive ? 'bg-kite text-ink' : 'text-white/80 hover:bg-white/10'}`;
  const tab = ({ isActive }) =>
    `flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-semibold ${isActive ? 'text-kite' : 'text-white/70'}`;

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-ink p-4 text-white sticky top-0 h-screen">
        <div className="px-3 mb-8 font-display text-xl font-extrabold leading-tight text-kite -skew-x-6">{BUSINESS.name}</div>
        <nav className="flex-1 space-y-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={side}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/15 px-3 pt-3 text-sm">
          <div className="font-semibold">{user.name}</div>
          <div className="capitalize text-white/60">{user.role === 'admin' ? 'Owner' : 'Team member'}</div>
          <button onClick={logout} className="mt-3 flex items-center gap-2 text-white/70 hover:text-white">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 pb-24 md:p-8">
        <div key={pathname} className="animate-rise">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around bg-ink py-1.5 md:hidden">
        {links.map(({ to, short, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={tab}>
            <Icon size={20} /> {short}
          </NavLink>
        ))}
        <button onClick={logout} className="flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-semibold text-white/70">
          <LogOut size={20} /> Exit
        </button>
      </nav>
    </div>
  );
}