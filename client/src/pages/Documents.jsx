import { useEffect, useState } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Documents() {
  const { user } = useAuth();
  const canUpload = ['admin', 'procurement_officer'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [file, setFile] = useState(null);
  const [standardId, setStandardId] = useState('');
  const [documentType, setDocumentType] = useState('other');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try { const { data } = await api.get('/documents'); setItems(data.data.items || []); }
    catch (e) { setError(e.response?.data?.message || 'Unable to load documents'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function upload() {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const body = new FormData(); body.append('file', file); body.append('documentType', documentType); if (documentType === 'standard' && standardId.trim()) body.append('standardId', standardId.trim());
      await api.post('/documents', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFile(null); setStandardId(''); setDocumentType('other'); document.getElementById('document-file').value = ''; await load();
    } catch (e) { setError(e.response?.data?.message || 'Upload failed'); }
    finally { setBusy(false); }
  }

  async function view(id) { try { const { data } = await api.get(`/documents/${id}`); setSelected(data.data); } catch (e) { setError(e.response?.data?.message || 'Unable to open document'); } }
  async function reprocess(id) { try { await api.post(`/documents/${id}/reprocess`); await load(); } catch (e) { setError(e.response?.data?.message || 'Unable to reprocess document'); } }
  async function remove(id) { if (!confirm('Delete this document and its indexed chunks?')) return; try { await api.delete(`/documents/${id}`); setSelected(null); await load(); } catch (e) { setError(e.response?.data?.message || 'Unable to delete document'); } }

  return <div>
    <div><h1 className="text-3xl font-bold">Documents</h1><p className="mt-2 text-slate-500">Upload source documents, extract text and prepare chunks for later AI retrieval.</p></div>
    {canUpload && <div className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-semibold">Upload source document</h2><p className="mt-1 text-xs text-slate-500">Supported: PDF, TXT, Markdown, CSV, JSON and XML. Maximum file size follows server configuration.</p><div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_280px_auto]"><input id="document-file" type="file" accept=".pdf,.txt,.md,.csv,.json,.xml" onChange={e=>setFile(e.target.files?.[0]||null)} className="rounded-lg border p-2"/><select value={documentType} onChange={e=>{setDocumentType(e.target.value);if(e.target.value!=='standard')setStandardId('')}} className="rounded-lg border px-3 py-2"><option value="standard">Standard</option><option value="tender">Tender</option><option value="guidance">Guidance / Manual</option><option value="other">Other</option></select><input value={standardId} onChange={e=>setStandardId(e.target.value)} disabled={documentType!=='standard'} placeholder={documentType==='standard'?'Optional Standard ID':'Standard ID only for Standard'} className="rounded-lg border px-3 py-2 disabled:bg-slate-50 disabled:text-slate-400"/><button disabled={!file||busy} onClick={upload} className="rounded-lg bg-slate-900 px-5 py-2 text-white disabled:opacity-40">{busy?'Uploading…':'Upload'}</button></div></div>}
    {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="mt-6 overflow-hidden rounded-2xl border bg-white">{loading ? <div className="p-8 text-slate-500">Loading documents…</div> : items.length === 0 ? <div className="p-8 text-slate-500">No documents uploaded yet.</div> : <div className="divide-y">{items.map(d=><div key={d._id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-semibold">{d.originalName}</h3><p className="mt-1 text-xs text-slate-500">{Math.round(d.fileSize/1024)} KB · {d.mimeType} · {d.documentType || 'other'} · {d.chunkCount || 0} chunks · embeddings: {d.embeddingStatus || 'pending'}</p>{d.standardId && <p className="mt-1 text-xs text-slate-500">Linked: {d.standardId.standardNumber || d.standardId.title}</p>}</div><div className="flex gap-2"><span className={`rounded-full px-2 py-1 text-xs ${d.status==='processed'?'bg-emerald-50 text-emerald-700':d.status==='failed'?'bg-red-50 text-red-700':'bg-amber-50 text-amber-700'}`}>{d.status}</span><button onClick={()=>view(d._id)} className="rounded-lg border px-3 py-2 text-sm">View</button>{canUpload && <button onClick={()=>reprocess(d._id)} className="rounded-lg border px-3 py-2 text-sm">Reprocess</button>}{user?.role==='admin'&&<button onClick={()=>remove(d._id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600">Delete</button>}</div></div></div>)}</div>}</div>
    {selected && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"><div className="mx-auto my-8 max-w-4xl rounded-2xl bg-white p-6"><div className="flex items-start justify-between"><div><h2 className="text-xl font-bold">{selected.document.originalName}</h2><p className="text-sm text-slate-500">{selected.document.status} · {selected.document.chunkCount} chunks · embeddings: {selected.document.embeddingStatus || 'pending'}</p></div><button onClick={()=>setSelected(null)} className="text-slate-500">✕</button></div>{selected.document.errorMessage && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{selected.document.errorMessage}</div>}{selected.document.embeddingError && <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">Embedding: {selected.document.embeddingError}</div>}<div className="mt-6"><h3 className="font-semibold">Extracted text</h3><pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{selected.document.extractedText || 'No extracted text yet.'}</pre></div><div className="mt-6"><h3 className="font-semibold">Indexed chunks</h3><div className="mt-2 space-y-3">{selected.chunks.map(c=><div key={c.chunkIndex} className="rounded-xl border p-4"><div className="text-xs font-semibold text-slate-400">Chunk {c.chunkIndex+1}</div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{c.text}</p></div>)}</div></div></div></div>}
  </div>;
}

