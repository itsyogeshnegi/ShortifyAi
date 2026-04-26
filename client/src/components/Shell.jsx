import { NavLink, Outlet } from 'react-router-dom';
import { Clapperboard, CreditCard, LayoutDashboard, Settings, Wand2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/create', label: 'Create Short', icon: Wand2 },
  { to: '/videos', label: 'My Videos', icon: Clapperboard },
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/settings', label: 'Settings', icon: Settings }
];

export default function Shell() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen overflow-x-hidden px-3 py-4 sm:px-5 lg:px-6 lg:py-6">
      <div className="app-shell mx-auto grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="glass rounded-[2rem] p-5 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <NavLink to="/" className="font-display text-2xl font-bold text-white">ShortifyAI</NavLink>
          <p className="mt-2 text-sm text-frost/60">Local AI shorts studio</p>
          <nav className="mt-8 grid gap-2">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    isActive ? 'bg-white text-ink' : 'text-frost/75 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-8 rounded-3xl bg-ink/50 p-4">
            <p className="text-sm text-frost/60">Local dashboard owner</p>
            <p className="font-bold">{user?.name}</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-mint">{user?.role}</p>
          </div>
        </aside>
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
