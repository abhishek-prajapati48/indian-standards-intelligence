import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import api from './services/api.js';
import Standards from './pages/Standards.jsx';
import StandardDetail from './pages/StandardDetail.jsx';
import Admin from './pages/Admin.jsx';
import Documents from './pages/Documents.jsx';
import { useState } from 'react';
import Recommendations from './pages/Recommendations.jsx';
import TenderValidation from './pages/TenderValidation.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Layout from './components/Layout.jsx';
import { Analytics } from '@vercel/analytics/react';

function Search(){const[q,setQ]=useState('');const[r,setR]=useState([]);const[loading,setLoading]=useState(false);const[error,setError]=useState('');const[notice,setNotice]=useState('');async function go(){if(!q.trim())return;setLoading(true);setError('');setNotice('');try{const x=await api.post('/search/semantic',{query:q,limit:8});setR(x.data.data.results||[]);setNotice(x.data.data.notice||'')}catch(e){setR([]);setError(e.response?.data?.message||'Semantic search unavailable')}finally{setLoading(false)}}return <Layout><h1 className="text-3xl font-bold">Standards Search</h1><p className="mt-2 text-slate-500">Semantic search over embedded document chunks using MongoDB Vector Search.</p><div className="mt-8 flex gap-3"><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go()} placeholder="e.g. pharmaceutical regulatory safety requirements" className="min-w-0 flex-1 rounded-xl border bg-white px-4 py-3"/><button onClick={go} disabled={loading} className="rounded-xl bg-slate-900 px-6 text-white disabled:opacity-50">{loading?'Searching…':'Search'}</button></div>{error&&<div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}{notice&&<div className="mt-4 rounded-xl border bg-white p-4 text-xs text-slate-500">{notice}</div>}<div className="mt-6 space-y-4">{r.map((x)=><div key={String(x.chunkId)} className="rounded-xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">
  {x.standardNumber
    ? `${x.standardNumber} — ${x.title}`
    : 'Source document'}
</h3><p className="mt-1 text-xs text-slate-400">Vector similarity: {((x.score||0)*100).toFixed(1)}%</p></div>{x.verificationStatus==='verified'?<span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Verified metadata</span>:<span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">Verify source</span>}</div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{x.snippet}</p></div>)}{!loading&&!error&&!r.length&&<div className="rounded-xl border bg-white p-8 text-center text-slate-500">Upload and embed a document, then search for a natural-language requirement.</div>}</div></Layout>}
function Placeholder({title}){return <Layout><h1 className="text-3xl font-bold">{title}</h1><div className="mt-8 rounded-xl border bg-white p-8 text-slate-500">This module will be implemented in the upcoming phase.</div></Layout>}
function App(){return <Routes><Route path="/login" element={<Login/>}/><Route path="/register" element={<Register/>}/><Route element={<ProtectedRoute/>}><Route path="/" element={<Dashboard/>}/><Route path="/admin" element={<ProtectedRoute roles={['admin']} />}><Route index element={<Layout><Admin/></Layout>}/></Route><Route path="/standards" element={<Layout><Standards/></Layout>}/><Route path="/standards/:id" element={<Layout><StandardDetail/></Layout>}/><Route path="/search" element={<Search/>}/><Route path="/tenders" element={<Layout><TenderValidation/></Layout>}/><Route path="/documents" element={<Layout><Documents/></Layout>}/><Route path="/recommendations" element={<Recommendations/>}/><Route path="/reports" element={<Placeholder title="Reports"/>}/></Route></Routes>}
createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><AuthProvider><App/><Analytics/></AuthProvider></BrowserRouter></React.StrictMode>);
