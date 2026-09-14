import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = {
  standardNumber: '', title: '', description: '', category: '', productCategory: '',
  edition: '', publicationDate: '', status: 'active', keywords: '',
  certificationRequirements: '', testingRequirements: '', safetyRequirements: '',
  installationRequirements: '', verified: false, sourceName: '', sourceUrl: ''
};

const splitLines = (value) => value.split('\n').map((x) => x.trim()).filter(Boolean);

export default function Standards() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ q: '', category: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load(page = 1) {
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/standards', { params: { ...filters, page, limit: 20 } });
      setItems(data.data.items || []);
      setPagination(data.data.pagination || { page, pages: 1, total: 0 });
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to load standards');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(1); }, []);

  function beginCreate() { setEditing('new'); setForm(emptyForm); }
  function beginEdit(item) {
    setEditing(item._id);
    setForm({
      ...emptyForm,
      ...item,
      keywords: (item.keywords || []).join(', '),
      certificationRequirements: (item.certificationRequirements || []).join('\n'),
      testingRequirements: (item.testingRequirements || []).join('\n'),
      safetyRequirements: (item.safetyRequirements || []).join('\n'),
      installationRequirements: (item.installationRequirements || []).join('\n'),
      publicationDate: item.publicationDate ? item.publicationDate.slice(0, 10) : '',
      sourceName: item.source?.name || '', sourceUrl: item.source?.url || ''
    });
  }

  async function save(e) {
    e.preventDefault(); setSaving(true); setError('');
    const payload = {
      standardNumber: form.standardNumber.trim(), title: form.title.trim(), description: form.description.trim(),
      category: form.category.trim(), productCategory: form.productCategory.trim(), edition: form.edition.trim(),
      publicationDate: form.publicationDate || undefined, status: form.status,
      keywords: form.keywords.split(',').map(x => x.trim()).filter(Boolean),
      certificationRequirements: splitLines(form.certificationRequirements),
      testingRequirements: splitLines(form.testingRequirements),
      safetyRequirements: splitLines(form.safetyRequirements),
      installationRequirements: splitLines(form.installationRequirements),
      verified: Boolean(form.verified),
      source: (form.sourceName || form.sourceUrl) ? { name: form.sourceName.trim(), url: form.sourceUrl.trim() } : undefined
    };
    try {
      if (editing === 'new') await api.post('/standards', payload);
      else await api.put(`/standards/${editing}`, payload);
      setEditing(null); await load(pagination.page || 1);
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to save standard');
    } finally { setSaving(false); }
  }

  async function remove(id) {
    if (!window.confirm('Delete this standard record?')) return;
    try { await api.delete(`/standards/${id}`); await load(pagination.page || 1); }
    catch (e) { setError(e.response?.data?.message || 'Unable to delete standard'); }
  }

  return <div>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-bold">Standards Registry</h1><p className="mt-2 text-slate-500">Browse verified standards metadata and relationships.</p></div>
      {isAdmin && <button onClick={beginCreate} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">+ Add Standard</button>}
    </div>

    <div className="mt-6 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_220px_180px_auto]">
      <input value={filters.q} onChange={e=>setFilters({...filters,q:e.target.value})} placeholder="Search number, title, description…" className="rounded-lg border px-3 py-2" />
      <input value={filters.category} onChange={e=>setFilters({...filters,category:e.target.value})} placeholder="Category" className="rounded-lg border px-3 py-2" />
      <select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})} className="rounded-lg border px-3 py-2"><option value="">All statuses</option><option value="active">Active</option><option value="withdrawn">Withdrawn</option><option value="draft">Draft</option></select>
      <button onClick={()=>load(1)} className="rounded-lg bg-slate-100 px-5 py-2 font-medium">Filter</button>
    </div>

    {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

    <div className="mt-6 overflow-hidden rounded-2xl border bg-white">
      {loading ? <div className="p-8 text-slate-500">Loading standards…</div> : items.length === 0 ? <div className="p-8 text-slate-500">No standards found.</div> : <div className="divide-y">
        {items.map(item => <div key={item._id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{item.standardNumber || 'No number'}</span>{item.edition && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">Ed. {item.edition}</span>}<span className={`rounded-full px-2 py-1 text-xs ${item.verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.verified ? 'Verified' : 'Unverified'}</span></div><h2 className="mt-2 text-lg font-semibold">{item.title}</h2><p className="mt-1 text-sm text-slate-500">{item.description || 'No description provided.'}</p></div>
            <div className="flex gap-2">{isAdmin && <><button onClick={()=>beginEdit(item)} className="rounded-lg border px-3 py-2 text-sm">Edit</button><button onClick={()=>remove(item._id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600">Delete</button></>}<Link to={`/standards/${item._id}`} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">View</Link></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">{item.category && <span className="rounded-full bg-slate-100 px-2 py-1">{item.category}</span>}{item.productCategory && <span className="rounded-full bg-slate-100 px-2 py-1">{item.productCategory}</span>}{item.status && <span className="rounded-full bg-slate-100 px-2 py-1">{item.status}</span>}</div>
        </div>)}
      </div>}
    </div>

    <div className="mt-4 flex items-center justify-between text-sm text-slate-500"><span>{pagination.total || 0} records</span><div className="flex gap-2"><button disabled={(pagination.page||1)<=1} onClick={()=>load(pagination.page-1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button><span className="px-2 py-2">Page {pagination.page || 1} / {pagination.pages || 1}</span><button disabled={(pagination.page||1)>=(pagination.pages||1)} onClick={()=>load(pagination.page+1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button></div></div>

    {editing && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"><div className="mx-auto my-8 max-w-3xl rounded-2xl bg-white p-6 shadow-xl"><div className="flex justify-between"><div><h2 className="text-xl font-bold">{editing === 'new' ? 'Add Standard' : 'Edit Standard'}</h2><p className="text-sm text-slate-500">Maintain registry metadata and verification status.</p></div><button onClick={()=>setEditing(null)} className="text-slate-500">✕</button></div><form onSubmit={save} className="mt-6 grid gap-4 md:grid-cols-2">
      <Field label="Standard number" value={form.standardNumber} onChange={v=>setForm({...form,standardNumber:v})} />
      <Field label="Edition" value={form.edition} onChange={v=>setForm({...form,edition:v})} />
      <div className="md:col-span-2"><Field label="Title" required value={form.title} onChange={v=>setForm({...form,title:v})} /></div>
      <Field label="Category" value={form.category} onChange={v=>setForm({...form,category:v})} />
      <Field label="Product category" value={form.productCategory} onChange={v=>setForm({...form,productCategory:v})} />
      <Field label="Publication date" type="date" value={form.publicationDate} onChange={v=>setForm({...form,publicationDate:v})} />
      <label className="block"><span className="mb-1 block text-sm font-medium">Status</span><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="w-full rounded-lg border px-3 py-2"><option>active</option><option>draft</option><option>withdrawn</option><option>superseded</option></select></label>
      <div className="md:col-span-2"><label className="block"><span className="mb-1 block text-sm font-medium">Description</span><textarea rows="3" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="w-full rounded-lg border px-3 py-2" /></label></div>
      <Field label="Keywords (comma separated)" value={form.keywords} onChange={v=>setForm({...form,keywords:v})} />
      <Field label="Source name" value={form.sourceName} onChange={v=>setForm({...form,sourceName:v})} />
      <Field label="Source URL" value={form.sourceUrl} onChange={v=>setForm({...form,sourceUrl:v})} />
      <div className="md:col-span-2 grid gap-4 md:grid-cols-2"><TextArea label="Certification requirements (one per line)" value={form.certificationRequirements} onChange={v=>setForm({...form,certificationRequirements:v})}/><TextArea label="Testing requirements (one per line)" value={form.testingRequirements} onChange={v=>setForm({...form,testingRequirements:v})}/><TextArea label="Safety requirements (one per line)" value={form.safetyRequirements} onChange={v=>setForm({...form,safetyRequirements:v})}/><TextArea label="Installation requirements (one per line)" value={form.installationRequirements} onChange={v=>setForm({...form,installationRequirements:v})}/></div>
      <label className="md:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.verified} onChange={e=>setForm({...form,verified:e.target.checked})}/><span>Mark this record as verified</span></label>
      <div className="md:col-span-2 flex justify-end gap-3 border-t pt-4"><button type="button" onClick={()=>setEditing(null)} className="rounded-lg border px-4 py-2">Cancel</button><button disabled={saving} className="rounded-lg bg-slate-900 px-5 py-2 text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save Standard'}</button></div>
    </form></div></div>}
  </div>;
}

function Field({ label, value, onChange, required, type='text' }) { return <label className="block"><span className="mb-1 block text-sm font-medium">{label}</span><input required={required} type={type} value={value || ''} onChange={e=>onChange(e.target.value)} className="w-full rounded-lg border px-3 py-2" /></label>; }
function TextArea({ label, value, onChange }) { return <label className="block"><span className="mb-1 block text-sm font-medium">{label}</span><textarea rows="4" value={value || ''} onChange={e=>onChange(e.target.value)} className="w-full rounded-lg border px-3 py-2" /></label>; }
