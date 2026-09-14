import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try { await login(form.email, form.password); navigate(location.state?.from?.pathname || '/'); }
    catch (err) { setError(err.response?.data?.message || 'Unable to sign in'); }
    finally { setBusy(false); }
  }

  return <AuthShell title="Sign in" subtitle="Access the Standards Intelligence Platform">
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} />
      <Field label="Password" type="password" value={form.password} onChange={v => setForm({ ...form, password: v })} />
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <button disabled={busy} className="w-full rounded-lg bg-slate-900 py-3 font-medium text-white disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <p className="mt-6 text-center text-sm text-slate-500">New user? <Link className="font-semibold text-slate-900" to="/register">Create an account</Link></p>
  </AuthShell>;
}

function Field({ label, type, value, onChange }) { return <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">{label}</span><input required type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-lg border px-3 py-3 outline-none focus:ring-2 focus:ring-slate-300" /></label>; }
function AuthShell({ title, subtitle, children }) { return <main className="min-h-screen bg-slate-100 grid place-items-center px-4"><section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm"><div className="mb-8"><div className="mb-3 inline-flex rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">SIP</div><h1 className="text-2xl font-bold text-slate-900">{title}</h1><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>{children}</section></main>; }
