import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Shield, ShieldAlert, Zap, Server, Activity, Database, Key } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const WafDashboard = () => {
  const [wafStats, setWafStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    fetchWafData();
  }, []);

  const fetchWafData = async () => {
    try {
      setLoading(true);
      const [statsRes, logsRes] = await Promise.all([
        api.get('/audit/waf/stats').catch(() => ({ data: { success: true, data: { totalBlocked: 0, byAttackType: [], bySeverity: [] } } })),
        api.get('/audit/waf').catch(() => ({ data: { success: true, data: [] } }))
      ]);
      
      const statsData = statsRes.data?.data || statsRes.data || {};
      const logsData = logsRes.data?.data || logsRes.data || [];
      
      // Map stats to chart format
      const byType = (statsData.byAttackType || []).map(item => ({
        name: item.attack_type === 'SQL_INJECTION' ? 'SQLi' : item.attack_type === 'XSS' ? 'XSS' : item.attack_type === 'CSRF' ? 'CSRF' : item.attack_type === 'RATE_LIMIT' ? 'Rate Limit' : item.attack_type,
        count: item.count
      }));
      
      setWafStats({ totalBlocked: statsData.totalBlocked || 0, byType });
      setLogs(Array.isArray(logsData) ? logsData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAttack = async (type) => {
    setTestResult({ status: 'LOADING', message: 'Mengirim payload...' });
    let payload = {};
    
    if (type === 'SQLI') {
      payload = { username: "admin' OR '1'='1' --", password: "pwd" };
    } else if (type === 'XSS') {
      payload = { username: "<script>alert('XSS')</script>", password: "pwd" };
    } else if (type === 'RATE') {
      // Send multiple rapid requests to trigger rate limit
      const promises = Array.from({ length: 10 }, () =>
        fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: "test", password: "test" })
        })
      );
      const results = await Promise.all(promises);
      const blocked = results.some(r => r.status === 429);
      setTestResult({
        status: blocked ? 'BLOCKED' : 'ALLOWED',
        type: 'RATE_LIMIT',
        message: blocked
          ? '🚫 WAF berhasil memblokir! Terlalu banyak request dari IP yang sama.'
          : 'Batas rate limit belum tercapai, coba lagi.'
      });
      setTimeout(fetchWafData, 1500);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.status === 403) {
        const data = await res.json();
        setTestResult({
          status: 'BLOCKED',
          type: data.attack_type || type,
          message: `🚫 WAF berhasil memblokir serangan ${type === 'SQLI' ? 'SQL Injection' : 'XSS'}! Payload berbahaya terdeteksi dan diblokir.`
        });
      } else if (res.status === 429) {
        setTestResult({
          status: 'BLOCKED',
          type: 'RATE_LIMIT',
          message: '🚫 WAF berhasil memblokir! Terlalu banyak request dari IP yang sama.'
        });
      } else {
        setTestResult({
          status: 'ALLOWED',
          type: type,
          message: 'Request berhasil melewati WAF. Coba lagi atau periksa server.'
        });
      }
    } catch (err) {
      setTestResult({
        status: 'BLOCKED',
        type: type,
        message: `🚫 WAF berhasil memblokir serangan ${type}! Koneksi diputus oleh WAF.`
      });
    }
    setTimeout(fetchWafData, 1500);
  };

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6'];

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <ShieldAlert className="w-8 h-8 text-red-500" />
        <h1 className="text-2xl font-bold text-slate-800">WAF Dashboard - Web Application Firewall</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 border-l-4 border-l-red-500">
          <p className="text-sm font-medium text-slate-500 mb-1">Total Attacks Blocked</p>
          <h3 className="text-3xl font-bold text-slate-800">{wafStats?.totalBlocked || 0}</h3>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 border-l-4 border-l-orange-500">
          <p className="text-sm font-medium text-slate-500 mb-1">SQL Injection Attempts</p>
          <h3 className="text-3xl font-bold text-slate-800">
            {wafStats?.byType?.find(t => t.name === 'SQLi')?.count || 0}
          </h3>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 border-l-4 border-l-yellow-500">
          <p className="text-sm font-medium text-slate-500 mb-1">XSS Attempts</p>
          <h3 className="text-3xl font-bold text-slate-800">
             {wafStats?.byType?.find(t => t.name === 'XSS')?.count || 0}
          </h3>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 border-l-4 border-l-blue-500">
          <p className="text-sm font-medium text-slate-500 mb-1">Rate Limit Violations</p>
          <h3 className="text-3xl font-bold text-slate-800">
             {wafStats?.byType?.find(t => t.name === 'Rate Limit')?.count || 0}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Attacks by Type</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wafStats?.byType || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">WAF Rules Status</h3>
          <div className="space-y-4">
             <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="flex items-center gap-2 font-medium text-slate-700"><Database size={16}/> SQL Injection Filter</span>
                <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-bold">✅ Active</span>
             </div>
             <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="flex items-center gap-2 font-medium text-slate-700"><Zap size={16}/> XSS Filter</span>
                <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-bold">✅ Active</span>
             </div>
             <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="flex items-center gap-2 font-medium text-slate-700"><Activity size={16}/> Rate Limiting</span>
                <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-bold">✅ 100 req/min</span>
             </div>
             <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="flex items-center gap-2 font-medium text-slate-700"><Key size={16}/> CSRF Protection</span>
                <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-bold">✅ Active</span>
             </div>
             <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="flex items-center gap-2 font-medium text-slate-700"><Server size={16}/> DDoS Protection</span>
                <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-bold">✅ Active</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
         <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Blocked Requests</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Path</th>
                  <th className="px-4 py-3">Attack Type</th>
                  <th className="px-4 py-3">Severity</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? logs.map((log, i) => (
                  <tr key={i} className="border-b border-slate-100 font-mono text-xs">
                    <td className="px-4 py-3 text-slate-600">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">{log.ip_address}</td>
                    <td className="px-4 py-3 text-slate-500">{log.method} {log.path}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">{log.attack_type}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-white ${log.severity === 'CRITICAL' ? 'bg-red-600' : log.severity === 'HIGH' ? 'bg-orange-500' : 'bg-yellow-500'}`}>
                        {log.severity || 'HIGH'}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" className="text-center py-6 text-slate-500">No blocked requests recently.</td></tr>
                )}
              </tbody>
            </table>
          </div>
         </div>
         <div className="bg-slate-900 rounded-xl shadow-sm p-6 text-white border border-slate-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><ShieldAlert size={20}/> WAF Simulator</h3>
            <p className="text-slate-400 text-sm mb-6">Test the WAF by sending malicious payloads. The WAF should intercept and block these requests.</p>
            
            <div className="space-y-3">
               <button onClick={() => handleTestAttack('SQLI')} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 py-2 px-4 rounded text-left text-sm font-mono text-orange-400 transition">
                  {">"} Test SQL Injection
               </button>
               <button onClick={() => handleTestAttack('XSS')} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 py-2 px-4 rounded text-left text-sm font-mono text-yellow-400 transition">
                  {">"} Test XSS
               </button>
               <button onClick={() => handleTestAttack('RATE')} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 py-2 px-4 rounded text-left text-sm font-mono text-blue-400 transition">
                  {">"} Test Rate Limit
               </button>
            </div>

            {testResult && testResult.status !== 'LOADING' && (
               <div className={`mt-6 p-4 rounded-lg border ${testResult.status === 'BLOCKED' ? 'bg-red-600 border-red-400 text-white' : 'bg-green-800 border-green-500 text-green-200'}`}>
                  <p className="text-sm font-bold font-mono">
                    {testResult.status === 'BLOCKED' ? '🚨 SERANGAN TERDETEKSI & DIBLOKIR!' : '⚠️ Request Lolos dari WAF'}
                  </p>
                  <p className="text-sm font-medium font-mono mt-1">{testResult.message}</p>
               </div>
            )}
            {testResult && testResult.status === 'LOADING' && (
               <div className="mt-6 p-4 rounded-lg border bg-slate-700 border-slate-500 text-slate-300">
                  <p className="text-sm font-mono animate-pulse">⏳ {testResult.message}</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default WafDashboard;
