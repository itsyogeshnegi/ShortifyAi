import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Clapperboard, CreditCard, LayoutDashboard, Plus, Settings, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/create', label: 'Create short', icon: Plus },
  { to: '/videos', label: 'Video library', icon: Clapperboard },
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/settings', label: 'Settings', icon: Settings }
];

const pageTitles = { '/dashboard': 'Overview', '/create': 'Create short', '/videos': 'Video library', '/billing': 'Billing', '/settings': 'Settings' };

export default function Shell() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const initials = (user?.name || 'SA').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <NavLink to="/dashboard" className="brand-mark" aria-label="ShortifyAI overview">
          <span className="brand-icon"><Video size={18} /></span>
          <span><strong>ShortifyAI</strong><small>Creator workspace</small></span>
        </NavLink>
        <nav className="workspace-nav" aria-label="Primary navigation">
          <p className="nav-section-label">Workspace</p>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-account">
          <span className="account-avatar">{initials}</span>
          <span className="min-w-0"><strong>{user?.name}</strong><small>{user?.email}</small></span>
        </div>
      </aside>

      <div className="workspace-content">
        <header className="workspace-topbar">
          <div className="mobile-brand"><span className="brand-icon"><Video size={17} /></span><strong>ShortifyAI</strong></div>
          <p>{pageTitles[pathname] || 'Workspace'}</p>
          <span className="system-status"><i /> Local system</span>
        </header>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `mobile-nav-item${isActive ? ' is-active' : ''}`}>
              <Icon size={18} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <main className="dashboard-main"><Outlet /></main>
      </div>
    </div>
  );
}
