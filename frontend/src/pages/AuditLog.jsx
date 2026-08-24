import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { ClipboardList, Download } from 'lucide-react';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/audit/logs');
        const data = res.data?.data || res.data || [];
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">Audit Log & Security Events</h1>
        </div>
        <button className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition">
          <Download size={18} /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Target</th>
                <th className="px-6 py-3">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center py-8">Loading logs...</td></tr>
              ) : logs.length > 0 ? (
                logs.map((log, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{new Date(log.created_at || log.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4 font-medium">{log.full_name || log.username || log.user || 'System'}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-semibold uppercase">{log.action}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{log.target_table || log.target || '-'}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{log.ip_address || log.ip || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="text-center py-8 text-slate-500">No audit logs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
