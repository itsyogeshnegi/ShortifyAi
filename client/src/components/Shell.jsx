import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Clapperboard, CreditCard, LayoutDashboard, Moon, Settings, Sun, Wand2 } from 'lucide-react';
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
  const [theme, setTheme] = useState(() => localStorage.getItem('shortifyai_theme') || 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('shortifyai_theme', theme);
  }, [theme]);

  const isLight = theme === 'light';

  return (
    <div className="min-h-screen overflow-x-hidden px-3 py-4 sm:px-5 lg:px-6 lg:py-6">
      <div className="app-shell mx-auto grid gap-5">
        <header className="glass sticky top-3 z-40 mb-[20px] rounded-[1.7rem] p-3 sm:top-5">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <NavLink to="/" className="flex min-w-0 items-center gap-3 rounded-2xl px-2 py-1">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-mint text-ink shadow-[0_0_28px_rgba(110,243,197,0.35)]">
                <Wand2 size={18} />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-xl font-bold text-white">ShortifyAI</span>
                <span className="block truncate text-xs text-frost/52">Neural shorts command center</span>
              </span>
            </NavLink>

            <nav className="order-3 flex w-full gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.035] p-1 sm:order-none sm:w-auto sm:flex-wrap sm:justify-center">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `group flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition sm:text-sm ${isActive ? 'bg-mint text-ink shadow-[0_0_28px_rgba(110,243,197,0.28)]' : 'text-frost/68 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon className="transition group-hover:scale-110" size={18} />
                  <span className="hidden md:inline">{label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <div className="hidden rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-right sm:block">
                <p className="text-xs text-frost/50">{user?.name}</p>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-mint">{user?.role}</p>
              </div>
              <button
                className="btn-muted grid h-11 w-11 place-items-center p-0"
                onClick={() => setTheme(isLight ? 'dark' : 'light')}
                title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
                type="button"
              >
                {isLight ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>
          </div>
        </header>

        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
