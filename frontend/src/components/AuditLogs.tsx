import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Terminal } from 'lucide-react';
import { apiRequest } from '../lib/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/logs');
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="text-rose-500" />
            Security & Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground">
            Audit trails recording uploads, deletions, approvals and login sessions on LAN.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-4 py-2 border border-border hover:border-primary rounded-lg text-sm font-medium flex items-center gap-2 bg-card transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
        {loading && logs.length === 0 ? (
          <div className="p-20 flex justify-center">
            <span className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-20 text-center text-muted-foreground">
            <Terminal size={48} className="mx-auto stroke-[1.5] mb-2" />
            <p className="text-sm">No activity logs recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <th className="p-4">Action</th>
                  <th className="p-4">Details</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-semibold text-primary">{log.action}</td>
                    <td className="p-4 text-xs text-muted-foreground max-w-md truncate" title={log.details}>
                      {log.details || 'N/A'}
                    </td>
                    <td className="p-4">
                      <div className="text-xs font-semibold">{log.user?.fullName}</div>
                      <div className="text-[10px] text-muted-foreground">@{log.user?.username}</div>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
