// frontend/src/components/Common/ProtectedRoute.jsx - CORREGIDA PARA CAS
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const auth = useAuth();
  const { user, loading, isAuthenticated } = auth;
  
  // Log para debugging
  console.log('🔍 AuthContext en ProtectedRoute:', {
    user: !!user,
    loading,
    isAuthenticated: isAuthenticated(),
    availableMethods: Object.keys(auth)
  });
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [processingCAS, setProcessingCAS] = useState(false);

  // ← PROCESAR TOKEN CAS AL CARGAR RUTA PROTEGIDA
  useEffect(() => {
    const processCASToken = async () => {
      const token = searchParams.get('token');
      const casLogin = searchParams.get('cas_login');
      const newUser = searchParams.get('new_user');

      // Si hay token CAS y no estamos autenticados
      if (token && casLogin === 'true' && !isAuthenticated()) {
        console.log('🎫 Procesando token CAS en ruta protegida...');
        setProcessingCAS(true);

        try {
          // Configurar token
          localStorage.setItem('token', token);
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verificar token y obtener usuario
          const response = await api.get('/auth/verify');
          
          if (response.data.success) {
            // Usar métodos del contexto de auth si están disponibles
            if (auth.setUser && typeof auth.setUser === 'function') {
              auth.setUser(response.data.data.user);
            }
            if (auth.setToken && typeof auth.setToken === 'function') {
              auth.setToken(token);
            }
            
            // Mostrar mensaje de bienvenida
            const welcomeMessage = newUser === 'true' 
              ? `¡Bienvenido al sistema! Usuario creado: ${response.data.data.user.full_name}`
              : `¡Bienvenido, ${response.data.data.user.full_name}!`;
            
            toast.success(welcomeMessage);
            
            console.log('✅ Sesión CAS establecida:', response.data.data.user);
            
            // Forzar recarga de la página para actualizar el contexto
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            throw new Error('Token inválido');
          }
        } catch (error) {
          console.error('❌ Error procesando token CAS:', error);
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
          toast.error('Error procesando autenticación CAS');
        } finally {
          setProcessingCAS(false);
        }
      }
    };

    processCASToken();
  }, [searchParams, isAuthenticated, auth]);

  // ← LIMPIAR PARÁMETROS CAS DE LA URL DESPUÉS DE PROCESAR
  useEffect(() => {
    const token = searchParams.get('token');
    const casLogin = searchParams.get('cas_login');

    if (token && casLogin && isAuthenticated() && !processingCAS) {
      console.log('🧹 Limpiando parámetros CAS de la URL');
      
      // Eliminar parámetros CAS de la URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('token');
      newSearchParams.delete('cas_login');
      newSearchParams.delete('new_user');
      
      // Actualizar URL sin recargar
      const newUrl = newSearchParams.toString() 
        ? `${location.pathname}?${newSearchParams.toString()}`
        : location.pathname;
      
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [isAuthenticated, processingCAS, location.pathname, searchParams, setSearchParams]);

  // Mostrar loading mientras se verifica la autenticación O se procesa CAS
  if (loading || processingCAS) {
    return <LoadingSpinner text={processingCAS ? "Estableciendo sesión CAS..." : "Verificando autenticación..."} />;
  }

  // Redirigir a login si no está autenticado (y no hay token CAS pendiente)
  const hasCASToken = searchParams.get('token') && searchParams.get('cas_login');
  if (!isAuthenticated() && !hasCASToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si aún estamos procesando CAS, mostrar loading
  if (hasCASToken && !isAuthenticated()) {
    return <LoadingSpinner text="Procesando autenticación CAS..." />;
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