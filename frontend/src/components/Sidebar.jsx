import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, GraduationCap, Award, ClipboardList, Shield, LogOut, Settings } from 'lucide-react';

const Sidebar = () => {
  const { user, logout, hasRole } = useAuth();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU', 'TU', 'SISWA'] },
    { to: '/students', label: 'Data Siswa', icon: <Users size={20} />, roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU', 'TU'] },
    { to: '/grades', label: 'Manajemen Nilai', icon: <GraduationCap size={20} />, roles: ['ADMIN', 'GURU'] },
    { to: '/certificates', label: 'Sertifikat & Ijazah', icon: <Award size={20} />, roles: ['ADMIN', 'KEPALA_SEKOLAH', 'TU'] },
    { to: '/audit', label: 'Audit Log', icon: <ClipboardList size={20} />, roles: ['ADMIN', 'KEPALA_SEKOLAH'] },
    { to: '/waf', label: 'WAF Dashboard', icon: <Shield size={20} />, roles: ['ADMIN'] },
    { to: '/mfa-setup', label: 'MFA Setup', icon: <Settings size={20} />, roles: ['ADMIN', 'KEPALA_SEKOLAH', 'GURU', 'TU', 'SISWA'] },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col transition-all duration-300">
      <div className="p-4 flex items-center gap-3 border-b border-slate-700">
        <Shield className="text-blue-400" size={28} />
        <h1 className="font-bold text-lg whitespace-nowrap">SMK SecureAdmin</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {navItems.filter(item => hasRole(item.roles)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-700">
        <div className="mb-4">
          <p className="text-sm font-medium text-white">{user?.username || 'User'}</p>
          <span className="inline-block px-2 py-1 mt-1 text-xs font-semibold bg-slate-700 text-slate-300 rounded-md">
            {user?.role || 'Role'}
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
