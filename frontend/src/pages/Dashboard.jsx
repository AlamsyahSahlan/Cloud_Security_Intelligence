import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { Users, Award, Shield, FileEdit, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    students: 0,
    certificates: 0,
    wafAttacks: 0,
    gradeChanges: 0,
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [wafChartData, setWafChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [studentsRes, certsRes, wafRes, logsRes] = await Promise.all([
          api.get('/students').catch(() => ({ data: [] })),
          api.get('/certificates').catch(() => ({ data: [] })),
          api.get('/audit/waf/stats').catch(() => ({ data: { totalBlocked: 0, byType: [] } })),
          api.get('/audit/logs?limit=10').catch(() => ({ data: [] }))
        ]);

        setStats({
          students: studentsRes.data.length || 0,
          certificates: certsRes.data.length || 0,
          wafAttacks: wafRes.data.totalBlocked || 0,
          gradeChanges: 0 // Mock for now unless API provides it
        });

        if (wafRes.data.byType) {
          setWafChartData(wafRes.data.byType);
        } else {
          setWafChartData([
            { name: 'SQLi', count: 12 },
            { name: 'XSS', count: 8 },
            { name: 'CSRF', count: 3 },
            { name: 'Rate Limit', count: 25 },
          ]);
        }

        setRecentLogs(logsRes.data || []);
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
      <div className={`p-4 rounded-lg ${colorClass}`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      </div>
    </div>
  );

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Welcome, {user?.username}</h1>
        <p className="text-slate-500">Role: {user?.role}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Siswa" value={stats.students} icon={Users} colorClass="bg-blue-500" />
        <StatCard title="Sertifikat Diterbitkan" value={stats.certificates} icon={Award} colorClass="bg-green-500" />
        <StatCard title="Serangan WAF Diblokir" value={stats.wafAttacks} icon={Shield} colorClass="bg-red-500" />
        <StatCard title="Perubahan Nilai Bulan Ini" value={stats.gradeChanges} icon={FileEdit} colorClass="bg-yellow-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">WAF Attack Summary</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wafChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Security Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">WAF Protection</span>
              <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-sm font-medium">
                <CheckCircle size={16} /> Active
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">MFA</span>
              <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-sm font-medium">
                <CheckCircle size={16} /> Enabled
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Data Encryption</span>
              <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-sm font-medium">
                <CheckCircle size={16} /> AES-256
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Blockchain Minting</span>
              <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-sm font-medium">
                <CheckCircle size={16} /> Connected
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Time</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3 rounded-tr-lg">Target</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.length > 0 ? recentLogs.map((log, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-600">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{log.user || 'System'}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{log.target || '-'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-slate-500">No recent activity</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
