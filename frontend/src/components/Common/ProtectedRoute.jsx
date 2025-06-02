import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return <LoadingSpinner />;
  }

  // Redirigir a login si no está autenticado
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar rol específico si es requerido
  if (requiredRole && user?.role !== requiredRole) {
    // Si es admin pero intenta acceder a ruta de user, redirigir a admin
    if (user?.role === 'admin' && requiredRole !== 'admin') {
      return <Navigate to="/admin" replace />;
    }
    
    // Si es user pero intenta acceder a ruta de admin, redirigir a dashboard
    if (user?.role === 'user' && requiredRole === 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    
    // Para otros casos, mostrar error de permisos
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <div className="mb-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Acceso Denegado
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            No tienes permisos para acceder a esta página.
          </p>
          <button
            onClick={() => window.history.back()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Volver Atrás
          </button>
        </div>
      </div>
    );
  }

  // Si todo está bien, renderizar el componente
  return children;
};

export default ProtectedRoute;