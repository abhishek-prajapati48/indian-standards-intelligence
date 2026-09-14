import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ShieldCheck, Users, FileCheck2, Database, RefreshCw, Search, UserCheck, UserX, Activity } from 'lucide-react';
import api from '../services/api.js';

const label = (value) => String(value || 'unknown').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

function Metric({ icon, title, value, hint }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-3xl font-bold text-slate-900">{value ?? '—'}</p><p className="mt-1 text-xs text-slate-400">{hint}</p></div>
      <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">{icon}</div>
    </div>
  </div>;
}

function Bars({ items, valueKey = 'count', labelKey = 'status' }) {
  const max = Math.max(...items.map(x => x[valueKey] || 0), 1);
  return <div className="space-y-3">{items.length ? items.map((item, i) => <div key={`${item[labelKey]}-${i}`}>
    <div className="mb-1 flex justify-between text-xs"><span className="font-medium text-slate-600">{label(item[labelKey])}</span><span className="text-slate-400">{item[valueKey]}</span></div>
    <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${Math.max((item[valueKey] / max) * 100, item[valueKey] ? 4 : 0)}%` }} /></div>
  </div>) : <p className="text-sm text-slate-400">No data available.</p>}</div>;
}

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingUser, setSavingUser] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const [s, a, u, l] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/analytics'),
        api.get(`/admin/users?q=${encodeURIComponent(q)}&role=${encodeURIComponent(role)}&active=${encodeURIComponent(active)}`),
        api.get(`/admin/audit-logs?limit=40${action ? `&action=${encodeURIComponent(action)}` : ''}`)
      ]);
      setStats(s.data.data.stats); setAnalytics(a.data.data); setUsers(u.data.data.items || []); setLogs(l.data.data.items || []);
    } catch (e) { setError(e.response?.data?.message || 'Unable to load admin analytics.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [q, role, active, action]);

  async function updateUser(user, patch) {
    setSavingUser(user._id); setError('');
    try { await api.patch(`/admin/users/${user._id}`, patch); await load(); }
    catch (e) { setError(e.response?.data?.message || 'Unable to update user.'); }
    finally { setSavingUser(''); }
  }

  const activeUsers = analytics?.users?.active ?? 0;
  const inactiveUsers = analytics?.users?.inactive ?? 0;
  const embeddingPending = analytics?.documents?.embeddings?.filter(x => ['pending','processing'].includes(x.status)).reduce((n, x) => n + x.count, 0) || 0;
  const criticalRisks = analytics?.tenders?.riskLevels?.filter(x => ['critical','high'].includes(x.level)).reduce((n, x) => n + x.count, 0) || 0;
  const totalStandards = stats?.total ?? 0;
  const verifiedRate = totalStandards ? Math.round((stats.verified / totalStandards) * 100) : 0;

  const roles = useMemo(() => analytics?.users?.byRole || [], [analytics]);

  return <div className="space-y-7">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><div className="flex items-center gap-3"><div className="rounded-2xl bg-indigo-100 p-3 text-indigo-600"><ShieldCheck size={28}/></div><div><h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin & Advanced Analytics</h1><p className="mt-1 text-slate-500">System governance, data quality, user access and operational intelligence.</p></div></div></div>
      <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"><RefreshCw size={16}/> Refresh</button>
    </div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric icon={<Database size={21}/>} title="Standards" value={stats?.total} hint={`${verifiedRate}% verified`} />
      <Metric icon={<FileCheck2 size={21}/>} title="Active standards" value={stats?.active} hint={`${stats?.unverified ?? 0} unverified`} />
      <Metric icon={<Users size={21}/>} title="Active users" value={activeUsers} hint={`${inactiveUsers} inactive`} />
      <Metric icon={<Activity size={21}/>} title="High / critical risks" value={criticalRisks} hint={`${embeddingPending} embeddings pending`} />
    </div>

    {loading && !analytics ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">Loading advanced analytics…</div> : <>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-center gap-3"><BarChart3 className="text-indigo-600" size={21}/><div><h2 className="font-semibold text-slate-900">User roles</h2><p className="text-xs text-slate-400">Account distribution by RBAC role</p></div></div><Bars items={roles} labelKey="role"/></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-center gap-3"><Database className="text-indigo-600" size={21}/><div><h2 className="font-semibold text-slate-900">Embedding health</h2><p className="text-xs text-slate-400">Document vectorization pipeline status</p></div></div><Bars items={analytics?.documents?.embeddings || []}/></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-center gap-3"><FileCheck2 className="text-indigo-600" size={21}/><div><h2 className="font-semibold text-slate-900">Tender validation status</h2><p className="text-xs text-slate-400">Current validation outcomes</p></div></div><Bars items={analytics?.tenders?.byStatus || []}/></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-center gap-3"><ShieldCheck className="text-indigo-600" size={21}/><div><h2 className="font-semibold text-slate-900">Tender risk flags</h2><p className="text-xs text-slate-400">Risk levels raised across validations</p></div></div><Bars items={analytics?.tenders?.riskLevels || []} labelKey="level"/></section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-semibold text-slate-900">User access management</h2><p className="text-xs text-slate-400 mt-1">Admin-only role and account activation controls.</p></div><div className="flex flex-wrap gap-2"><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name or email" className="h-10 w-60 rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"/></div><select value={role} onChange={e=>setRole(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="">All roles</option><option value="admin">Admin</option><option value="procurement_officer">Procurement Officer</option><option value="supplier">Supplier</option><option value="viewer">Viewer</option></select><select value={active} onChange={e=>setActive(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="">All status</option><option value="true">Active</option><option value="false">Inactive</option></select></div></div></div>
        <div className="divide-y divide-slate-100">{users.map(u=><div key={u._id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold">{(u.name || 'U').charAt(0).toUpperCase()}</div><div><p className="font-medium text-slate-800">{u.name}</p><p className="text-xs text-slate-400">{u.email} · Last login: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</p></div></div><div className="flex flex-wrap items-center gap-2"><select disabled={savingUser === u._id} value={u.role} onChange={e=>updateUser(u,{role:e.target.value})} className="h-9 rounded-lg border border-slate-200 px-2 text-xs"><option value="admin">Admin</option><option value="procurement_officer">Procurement Officer</option><option value="supplier">Supplier</option><option value="viewer">Viewer</option></select><span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${u.isActive ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{u.isActive ? 'Active' : 'Inactive'}</span><button disabled={savingUser === u._id} onClick={()=>updateUser(u,{isActive:!u.isActive})} className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium ${u.isActive ? 'border-red-100 bg-red-50 text-red-600' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>{u.isActive ? <UserX size={14}/> : <UserCheck size={14}/>} {u.isActive ? 'Deactivate' : 'Activate'}</button></div></div>)}{!users.length && <div className="p-8 text-center text-sm text-slate-400">No users match the selected filters.</div>}</div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-900">System audit trail</h2><p className="text-xs text-slate-400 mt-1">Recent administrative and application activity.</p></div><select value={action} onChange={e=>setAction(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="">All actions</option>{[...new Set(logs.map(x=>x.action).filter(Boolean))].map(x=><option key={x} value={x}>{x}</option>)}</select></div>
        <div className="divide-y divide-slate-100">{logs.map(log=><div key={log._id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between text-sm"><div><span className="font-semibold text-slate-800">{log.action}</span><span className="ml-2 text-slate-500">{log.resource || 'System'} {log.resourceId ? `· ${log.resourceId}` : ''}</span></div><div className="text-xs text-slate-400">{log.userId?.name || 'System'} · {new Date(log.createdAt).toLocaleString()}</div></div>)}{!logs.length && <div className="p-8 text-center text-sm text-slate-400">No audit activity found.</div>}</div>
      </section>
    </>}
  </div>;
}
