import { useEffect, useState } from 'react';
import { Bug, Check, Copy, RefreshCw, Trash2, AlertTriangle, ShieldCheck, Terminal } from 'lucide-react';
import { api } from '../api/http.js';

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/system/logs');
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not retrieve system error logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClearLogs = async () => {
    try {
      await api.delete('/system/logs');
      setLogs([]);
    } catch {
      // Ignore
    }
  };

  const copyLogEntry = (log) => {
    const formatted = `[SHORTIFYAI BUG REPORT]
Timestamp: ${log.formattedTime || log.timestamp}
Source Module: ${log.source}
Error Message: ${log.message}
Metadata: ${JSON.stringify(log.metadata || {}, null, 2)}
Stack Trace:
${log.stack || 'No stack trace available.'}`;

    navigator.clipboard.writeText(formatted).then(() => {
      setCopiedId(log.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const copyAllLogs = () => {
    if (!logs.length) return;
    const formattedAll = logs
      .map((log, idx) => {
        return `=== BUG #${idx + 1} ===
Timestamp: ${log.formattedTime || log.timestamp}
Source: ${log.source}
Message: ${log.message}
Metadata: ${JSON.stringify(log.metadata || {})}
Stack:
${log.stack || 'N/A'}`;
      })
      .join('\n\n------------------------------------\n\n');

    navigator.clipboard.writeText(formattedAll).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1115] p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10 text-danger border border-danger/20">
              <Bug size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">System Logs & Bug Tracker</h1>
                <span className="rounded-full bg-danger/20 px-2.5 py-0.5 text-xs font-semibold text-danger border border-danger/30">
                  Last 5 Errors Only
                </span>
              </div>
              <p className="text-xs text-frost/60 mt-1">
                Real-time capture of the latest 5 application exceptions. Copy logs in 1 click to share and resolve issues quickly.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 transition disabled:opacity-50"
              type="button"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>

            {logs.length > 0 && (
              <>
                <button
                  onClick={copyAllLogs}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-mint/30 bg-mint/10 px-3.5 py-2 text-xs font-bold text-mint hover:bg-mint/20 transition"
                  type="button"
                >
                  {copiedAll ? <Check size={14} /> : <Copy size={14} />}
                  {copiedAll ? '✓ All 5 Copied!' : 'Copy All Logs'}
                </button>

                <button
                  onClick={handleClearLogs}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
                  type="button"
                >
                  <Trash2 size={13} /> Clear Logs
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-xs text-danger flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && logs.length === 0 && (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#0d1115]/60 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-mint/10 text-mint border border-mint/20 mb-4">
            <ShieldCheck size={32} />
          </div>
          <h3 className="text-base font-bold text-white">System is Clean & Healthy</h3>
          <p className="max-w-md text-xs text-frost/60 mt-1.5">
            No active bugs or uncaught exceptions recorded. All services (TTS, Video Pipeline, AI Models, APIs) are operating without logged faults.
          </p>
        </div>
      )}

      {/* Log Cards List */}
      {logs.length > 0 && (
        <div className="space-y-4">
          {logs.map((log, index) => {
            const isCopied = copiedId === log.id;
            return (
              <div
                key={log.id}
                className="relative overflow-hidden rounded-2xl border border-danger/25 bg-[#0a0d12] p-5 shadow-xl transition hover:border-danger/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-danger/20 text-[11px] font-black text-danger border border-danger/30">
                      #{index + 1}
                    </span>
                    <span className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white border border-white/10">
                      {log.source || 'Backend'}
                    </span>
                    <span className="text-[11px] text-frost/50 font-mono">
                      {log.formattedTime || new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={() => copyLogEntry(log)}
                    type="button"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-sm ${
                      isCopied
                        ? 'bg-mint text-black border border-mint'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/15'
                    }`}
                  >
                    {isCopied ? <Check size={13} /> : <Copy size={13} />}
                    {isCopied ? '✓ Copied Bug Log!' : 'Copy Bug Log'}
                  </button>
                </div>

                {/* Error Message */}
                <div className="mt-3.5 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5">
                  <p className="font-mono text-xs font-bold text-red-300 break-words">
                    {log.message}
                  </p>
                </div>

                {/* Stack Trace Box */}
                {log.stack && (
                  <div className="mt-3 rounded-lg border border-black bg-[#050709] p-3.5">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                      <span className="flex items-center gap-1 text-[10px] font-mono text-frost/40 uppercase">
                        <Terminal size={11} /> Traceback details
                      </span>
                    </div>
                    <pre className="max-h-48 overflow-x-auto overflow-y-auto font-mono text-[11px] leading-relaxed text-frost/70 whitespace-pre-wrap break-all">
                      {log.stack}
                    </pre>
                  </div>
                )}

                {/* Metadata tags if present */}
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-white/5 text-[11px] text-frost/60">
                    {Object.entries(log.metadata).map(([k, v]) => (
                      <span key={k} className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] text-frost/70 border border-white/5">
                        {k}: <strong className="text-white">{String(v)}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
