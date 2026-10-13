import { NavLink } from 'react-router-dom';
import { BadgeCheck, ChartNoAxesCombined, ClipboardCheck, FileText, Landmark, LogOut, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = [
    { path: '/', label: 'Overview', icon: ChartNoAxesCombined, end: true },
    { path: '/standards', label: 'Standards', icon: ShieldCheck },
    { path: '/search', label: 'Search', icon: Search },
    { path: '/tenders', label: 'Tender review', icon: ClipboardCheck },
    { path: '/documents', label: 'Documents', icon: FileText },
    { path: '/recommendations', label: 'AI insights', icon: Sparkles },
    { path: '/reports', label: 'Reports', icon: ChartNoAxesCombined }
  ];

  return <div className="app-shell">
    <div className="app-utility-bar"><span><span className="app-tricolor" aria-hidden="true"><i/><i/><i/></span> Government of India · Standards Intelligence Platform</span><span><BadgeCheck size={14}/> Verified workspace</span></div>
    <header className="app-brand-row">
      <div className="app-brand-lockup"><div className="app-brand-mark"><Landmark size={25}/></div><div><span className="app-brand-kicker">Bureau of Indian Standards</span><strong>Standards Intelligence</strong><small>Standards &amp; public procurement</small></div></div>
      <div className="app-account"><div className="app-account-copy"><strong>{user?.name}</strong><span>{(user?.role || 'member').replaceAll('_', ' ')}</span></div><button className="app-signout" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={17}/><span>Sign out</span></button></div>
    </header>
    <nav className="app-nav" aria-label="Main navigation">
      <div className="app-nav-inner">{nav.map(({ path, label, icon: Icon, end }) => <NavLink key={path} to={path} end={end} className={({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`}><Icon size={16}/><span>{label}</span></NavLink>)}
        {user?.role === 'admin' && <NavLink to="/admin" className={({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`}><ShieldCheck size={16}/><span>Administration</span></NavLink>}
      </div>
    </nav>
    <main className="app-main"><div className="app-content">{children}</div></main>
  </div>;
}
