import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ShieldCheck, Search, ClipboardCheck, AlertTriangle, Database, ArrowRight, RefreshCw } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from '../components/Layout.jsx';

const statusLabel = {
  validated: 'Validated', needs_review: 'Needs review', high_risk: 'High risk', failed: 'Failed', not_started: 'Not started'
};

function MetricCard({ icon: Icon, label, value, hint, to }) {
  const body = <div className="dashboard-metric-card"><div className="dashboard-metric-icon"><Icon size={18}/></div><div className="dashboard-metric-copy"><span>{label}</span><strong>{value ?? '—'}</strong><small>{hint}</small></div></div>;
  return to ? <Link className="dashboard-link-card" to={to}>{body}</Link> : body;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try { const r = await api.get('/dashboard/summary'); setData(r.data.data); }
    catch (e) { setError(e.response?.data?.message || 'Unable to load dashboard data'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const m = data?.metrics;
  const riskTotal = (data?.riskDistribution || []).reduce((a, x) => a + x.count, 0);

  return <Layout><div className="dashboard-page">
    <div className="dashboard-header">
      <div><div className="dashboard-eyebrow">Standards Intelligence Platform</div><h1>Dashboard</h1><p>Operational view of standards, documents, AI recommendations and tender validation.</p></div>
      <button className="dashboard-refresh" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/> {loading ? 'Refreshing…' : 'Refresh'}</button>
    </div>

    {error && <div className="dashboard-error">{error}</div>}

    {loading && !data ? <div className="dashboard-loading">Loading workspace metrics…</div> : <>
      <section className="dashboard-metrics">
        <MetricCard icon={ShieldCheck} label="Total standards" value={m?.standards.total} hint={`${m?.standards.verified ?? 0} verified`} to="/standards" />
        <MetricCard icon={FileText} label="Documents" value={m?.documents.total} hint={`${m?.documents.embedded ?? 0} embedded`} to="/documents" />
        <MetricCard icon={Search} label="AI recommendations" value={m?.recommendations.total} hint="Saved analyses" to="/recommendations" />
        <MetricCard icon={ClipboardCheck} label="Tender validations" value={m?.tenders.total} hint={`${m?.tenders.validated ?? 0} validated`} to="/tenders" />
      </section>

      <section className="dashboard-grid dashboard-grid-main">
        <div className="dashboard-card">
          <div className="dashboard-card-heading"><div><h2>Standards registry</h2><p>Verification and availability</p></div><Link to="/standards">Open registry <ArrowRight size={14}/></Link></div>
          <div className="dashboard-progress-row"><span>Verified</span><strong>{m?.standards.verified ?? 0} / {m?.standards.total ?? 0}</strong></div>
          <div className="dashboard-progress"><span style={{ width: `${m?.standards.total ? Math.round((m.standards.verified / m.standards.total) * 100) : 0}%` }}/></div>
          <div className="dashboard-mini-grid"><div><span>Active</span><strong>{m?.standards.active ?? 0}</strong></div><div><span>Unverified</span><strong>{m?.standards.unverified ?? 0}</strong></div></div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-heading"><div><h2>Document pipeline</h2><p>Processing and embedding health</p></div><Link to="/documents">Open documents <ArrowRight size={14}/></Link></div>
          <div className="dashboard-mini-grid dashboard-mini-three"><div><span>Total</span><strong>{m?.documents.total ?? 0}</strong></div><div><span>Processed</span><strong>{m?.documents.processed ?? 0}</strong></div><div><span>Embedded</span><strong>{m?.documents.embedded ?? 0}</strong></div></div>
          <div className="dashboard-pipeline"><div><span style={{ width: `${m?.documents.total ? Math.round((m.documents.processed / m.documents.total) * 100) : 0}%` }}/></div><small>{m?.documents.total ? Math.round((m.documents.processed / m.documents.total) * 100) : 0}% processed</small></div>
        </div>
      </section>

      <section className="dashboard-grid dashboard-grid-main">
        <div className="dashboard-card">
          <div className="dashboard-card-heading"><div><h2>Tender risk overview</h2><p>Validation outcomes across your workspace</p></div><Link to="/tenders">Review tenders <ArrowRight size={14}/></Link></div>
          <div className="dashboard-risk-summary"><div className="dashboard-risk-number"><strong>{m?.tenders.highRisk ?? 0}</strong><span>High-risk / failed</span></div><div className="dashboard-risk-bars">{(data?.riskDistribution || []).map(x => <div className="risk-bar-row" key={x.status}><div><span>{statusLabel[x.status] || x.status}</span><strong>{x.count}</strong></div><div className="risk-bar"><span style={{ width: `${riskTotal ? Math.round((x.count / riskTotal) * 100) : 0}%` }}/></div></div>)}</div></div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-heading"><div><h2>Standards by category</h2><p>Top registry categories</p></div></div>
          <div className="category-list">{(data?.categories || []).length ? data.categories.map(x => <div className="category-row" key={x.category}><span title={x.category}>{x.category}</span><strong>{x.count}</strong></div>) : <div className="dashboard-empty">No categories recorded yet.</div>}</div>
        </div>
      </section>

      <section className="dashboard-grid dashboard-grid-bottom">
        <div className="dashboard-card"><div className="dashboard-card-heading"><div><h2>Recent tenders</h2><p>Latest validation activity</p></div><Link to="/tenders">View all <ArrowRight size={14}/></Link></div><div className="dashboard-list">{data?.recent.tenders?.length ? data.recent.tenders.map(t => <div className="dashboard-list-row" key={t._id}><div><strong>{t.title}</strong><span>{new Date(t.createdAt).toLocaleString()}</span></div><span className={`dashboard-status ${t.validationStatus}`}>{statusLabel[t.validationStatus] || t.validationStatus}</span></div>) : <div className="dashboard-empty">No tender validations yet.</div>}</div></div>
        <div className="dashboard-card"><div className="dashboard-card-heading"><div><h2>Recent documents</h2><p>Latest source material</p></div><Link to="/documents">View all <ArrowRight size={14}/></Link></div><div className="dashboard-list">{data?.recent.documents?.length ? data.recent.documents.map(d => <div className="dashboard-list-row" key={d._id}><div><strong>{d.originalName}</strong><span>{d.chunkCount ?? 0} chunks · {new Date(d.createdAt).toLocaleDateString()}</span></div><span className={`dashboard-status ${d.status}`}>{d.status}</span></div>) : <div className="dashboard-empty">No documents uploaded yet.</div>}</div></div>
      </section>

      <section className="dashboard-card dashboard-activity"><div className="dashboard-card-heading"><div><h2>Recent activity</h2><p>Actions recorded for {user?.role === 'admin' ? 'the platform' : 'your account'}</p></div></div><div className="dashboard-list">{data?.recent.activity?.length ? data.recent.activity.map(a => <div className="dashboard-list-row" key={a._id}><div><strong>{a.action} · {a.resource}</strong><span>{a.userId?.name || 'System'} · {new Date(a.createdAt).toLocaleString()}</span></div><span className="dashboard-activity-id">{a.resourceId || '—'}</span></div>) : <div className="dashboard-empty">No recent activity recorded.</div>}</div></section>
    </>}
  </div></Layout>;
}
