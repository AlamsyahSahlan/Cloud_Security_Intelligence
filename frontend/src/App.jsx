import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Grades from './pages/Grades'
import Certificates from './pages/Certificates'
import VerifyDocument from './pages/VerifyDocument'
import AuditLog from './pages/AuditLog'
import WafDashboard from './pages/WafDashboard'
import MfaSetup from './pages/MfaSetup'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import { useAuth } from './contexts/AuthContext'

function App() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="flex h-screen bg-slate-50">
      {isAuthenticated && <Sidebar />}
      <div className={`flex-1 overflow-y-auto ${isAuthenticated ? 'w-full' : 'w-full'}`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<VerifyDocument />} />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/students" element={
            <ProtectedRoute roles={['TU', 'ADMIN', 'KEPALA_SEKOLAH', 'GURU']}>
              <Students />
            </ProtectedRoute>
          } />
          
          <Route path="/grades" element={
            <ProtectedRoute roles={['GURU', 'ADMIN']}>
              <Grades />
            </ProtectedRoute>
          } />
          
          <Route path="/certificates" element={
            <ProtectedRoute roles={['TU', 'ADMIN', 'KEPALA_SEKOLAH']}>
              <Certificates />
            </ProtectedRoute>
          } />
          
          <Route path="/audit" element={
            <ProtectedRoute roles={['ADMIN', 'KEPALA_SEKOLAH']}>
              <AuditLog />
            </ProtectedRoute>
          } />
          
          <Route path="/waf" element={
            <ProtectedRoute roles={['ADMIN']}>
              <WafDashboard />
            </ProtectedRoute>
          } />

          <Route path="/mfa-setup" element={
            <ProtectedRoute>
              <MfaSetup />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </div>
  )
}

export default App
