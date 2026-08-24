import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, User, AlertCircle, FileText } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password, mfaToken);
      if (result.mfaRequired) {
        setMfaRequired(true);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Sistem Administrasi SMK</h1>
          <p className="text-slate-400">Cloud Security Architecture</p>
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-8 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Login to your account</h2>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  disabled={mfaRequired}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  disabled={mfaRequired}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {mfaRequired && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">MFA Token (Authenticator App)</label>
                <input
                  type="text"
                  required
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter 6-digit code"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : (mfaRequired ? 'Verify Token' : 'Sign In')}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <Link to="/verify" className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors">
              <FileText className="w-4 h-4" />
              Go to Document Verification Portal
            </Link>
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700 mb-6">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-xs text-slate-300 font-medium">Protected by WAF & Zero Trust Architecture</span>
          </div>

          <div className="text-xs text-slate-500 text-left bg-slate-800/80 p-4 rounded-lg border border-slate-700">
            <p className="font-semibold text-slate-300 mb-2">Demo Credentials:</p>
            <ul className="space-y-1">
              <li>Admin: admin / Admin@123</li>
              <li>Kepala Sekolah: kepsek / Kepsek@123</li>
              <li>Guru: guru1 / Guru@123</li>
              <li>TU: tu1 / TataUsaha@123</li>
              <li>Siswa: siswa1 / Siswa@123</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
