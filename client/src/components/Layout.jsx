import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = [['/','Dashboard'],['/standards','Standards Registry'],['/search','Standards Search'],['/tenders','Tender Validation'],['/documents','Documents'],['/recommendations','Recommendations'],['/reports','Reports']];
  return <div className="min-h-screen flex bg-slate-50"><aside className="hidden w-64 bg-slate-900 p-6 text-white md:block"><div className="mb-8"><div className="text-lg font-bold">Standards Intelligence</div><div className="mt-1 text-xs text-slate-400">Standards & Tender Platform</div></div><nav className="space-y-1">{nav.map(([p,t])=><Link key={p} className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-800" to={p}>{t}</Link>)}{user?.role === 'admin' && <Link className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-800" to="/admin">Admin Overview</Link>}</nav></aside><main className="min-w-0 flex-1"><header className="flex items-center justify-between border-b bg-white px-5 py-4 md:px-8"><div><span className="font-semibold">{user?.name}</span><span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{user?.role}</span></div><button onClick={logout} className="text-sm text-slate-600 hover:text-slate-900">Sign out</button></header><div className="p-5 md:p-8">{children}</div></main></div>;
}
