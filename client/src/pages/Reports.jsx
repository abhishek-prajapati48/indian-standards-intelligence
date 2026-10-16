import { useEffect, useState } from 'react';
import { Download, FileText, RefreshCw } from 'lucide-react';
import api from '../services/api.js';

const statusLabel = {
  validated: 'Validated',
  needs_review: 'Needs review',
  high_risk: 'High risk',
  failed: 'Failed',
  not_started: 'Not started'
};

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [tenders, setTenders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [summaryResponse, tendersResponse] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/tenders')
      ]);
      setSummary(summaryResponse.data.data);
      setTenders(tendersResponse.data.data.items || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openReport(id) {
    setOpeningId(id);
    setError('');
    try {
      const response = await api.get(`/tenders/${id}`);
      setSelected(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to open this validation report.');
    } finally {
      setOpeningId('');
    }
  }

  function downloadCsv() {
    if (!selected) return;
    const requirements = selected.requirements || [];
    const rows = [
      ['Requirement', 'Type', 'Status', 'Risk', 'Matched standard', 'Match explanation'],
      ...requirements.map((requirement) => {
        const bestMatch = requirement.evidence?.[0];
        return [
          requirement.text,
          requirement.type,
          statusLabel[requirement.status] || requirement.status || 'Unknown',
          requirement.riskLevel || 'Unknown',
          [bestMatch?.standardNumber, bestMatch?.title].filter(Boolean).join(' — ') || 'No registry match',
          bestMatch?.why || 'No matching evidence found in the registry.'
        ];
      })
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${String(selected.title || 'tender-report').replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const report = selected?.report;
  const metrics = summary?.metrics;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
          <p className="mt-2 text-slate-600">Workspace activity and saved tender validation reports.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Standards', metrics?.standards?.total],
          ['Processed documents', metrics?.documents?.processed],
          ['Recommendations', metrics?.recommendations?.total],
          ['Tender validations', metrics?.tenders?.total]
        ].map(([label, value]) => (
          <article key={label} className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{loading && value === undefined ? '…' : value ?? 0}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileText size={18} className="text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Tender validation reports</h2>
        </div>
        {loading && !tenders.length ? <p className="text-sm text-slate-500">Loading reports…</p>
          : !tenders.length ? <p className="text-sm text-slate-500">No tender validation reports are available yet.</p>
            : <div className="divide-y">
              {tenders.map((tender) => (
                <div key={tender._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-slate-900">{tender.title || 'Untitled validation'}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(tender.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                      {statusLabel[tender.validationStatus] || tender.validationStatus || 'Unknown'}
                    </span>
                    <button className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50" onClick={() => openReport(tender._id)} disabled={Boolean(openingId)}>
                      {openingId === tender._id ? 'Opening…' : 'Open report'}
                    </button>
                  </div>
                </div>
              ))}
            </div>}
      </section>

      {selected && report && (
        <section className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{selected.title || 'Tender validation report'}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {report.requirementsAnalyzed ?? selected.requirements?.length ?? 0} requirements · {Math.round((report.coverage || 0) * 100)}% standards coverage
              </p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white" onClick={downloadCsv} disabled={!selected.requirements?.length}>
              <Download size={15} /> Export CSV
            </button>
          </div>

          {selected.requirements?.length
            ? <div className="space-y-3">
              {selected.requirements.map((requirement, index) => {
                const bestMatch = requirement.evidence?.[0];
                return (
                  <article key={requirement._id || index} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-medium text-slate-900">R{index + 1} · {requirement.type || 'Requirement'}</h3>
                      <span className="text-xs text-slate-600">{statusLabel[requirement.status] || requirement.status || 'Unknown'} · {requirement.riskLevel || 'Unknown'} risk</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{requirement.text || 'No requirement text saved.'}</p>
                    {bestMatch
                      ? <p className="mt-3 text-sm text-slate-600"><strong>Registry match:</strong> {[bestMatch.standardNumber, bestMatch.title].filter(Boolean).join(' — ') || 'Standard record'}<br /><span className="text-xs">{bestMatch.why || 'Semantic or registry evidence matched this requirement.'}</span></p>
                      : <p className="mt-3 text-sm text-amber-700">No matching standard was found in the registry.</p>}
                  </article>
                );
              })}
            </div>
            : <p className="text-sm text-slate-500">This saved report has no requirement details.</p>}
        </section>
      )}
    </div>
  );
}
