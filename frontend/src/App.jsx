// frontend/src/App.jsx - Rutas CAS corregidas
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/Common/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import { Toaster } from 'react-hot-toast';

// ✅ IMPORTAR COMPONENTE CAS CALLBACK
import CASCallback from './components/CAS/CASCallback';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Rutas públicas */}
            <Route path="/login" element={<Login />} />
            
            {/* ✅ RUTA PARA CAS CALLBACK */}
            <Route path="/auth/cas/callback" element={<CASCallback />} />
            
            {/* Rutas protegidas */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Redirección por defecto */}
            <Route path="/" element={<Navigate to="/login" />} />
            
            {/* Ruta 404 */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
                  <p className="text-gray-600 mb-4">Página no encontrada</p>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">URL actual: {window.location.pathname}</p>
                    <a href="/" className="text-blue-600 hover:text-blue-800 underline">
                      Volver al inicio
                    </a>
                  </div>
                </div>
              </div>
            } />
          </Routes>
          
          {/* Notificaciones toast */}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                theme: {
                  primary: '#4aed88',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;