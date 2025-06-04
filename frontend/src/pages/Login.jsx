// frontend/src/pages/Login.jsx - Componente Login actualizado con CAS
import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { InlineSpinner } from '../components/Common/LoadingSpinner';
import { casService } from '../services/casService';
import toast from 'react-hot-toast';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [casLoading, setCasLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [casEnabled, setCasEnabled] = useState(false);

  const { login, isAuthenticated, user, setUser, setToken } = useAuth();
  const location = useLocation();

  // Verificar estado de CAS al cargar
  useEffect(() => {
    checkCASStatus();
    handleCASCallback();
  }, []);

  // Verificar si CAS está habilitado
  const checkCASStatus = async () => {
    try {
      const status = await casService.getStatus();
      setCasEnabled(status.cas_enabled);
      console.log('Estado CAS:', status);
    } catch (error) {
      console.error('Error verificando CAS:', error);
      setCasEnabled(false);
    }
  };

  // Manejar callback de CAS
  const handleCASCallback = async () => {
    const callback = casService.handleCallback();
    
    if (callback.error) {
      // Mostrar error de CAS
      let errorMessage = 'Error en autenticación CAS';
      
      switch (callback.error) {
        case 'no_ticket':
          errorMessage = 'No se recibió ticket de autenticación de CAS';
          break;
        case 'cas_validation_failed':
          errorMessage = `Error validando con CAS: ${callback.errorMessage}`;
          break;
        case 'user_not_authorized':
          errorMessage = `Usuario no autorizado: ${callback.errorMessage}`;
          break;
        case 'cas_callback_error':
          errorMessage = `Error en callback CAS: ${callback.errorMessage}`;
          break;
        default:
          errorMessage = callback.errorMessage || 'Error desconocido en CAS';
      }
      
      toast.error(errorMessage, { duration: 5000 });
      return;
    }

    if (callback.token && callback.casLogin) {
      // Procesar token de CAS
      const success = casService.processCallbackToken(callback.token);
      
      if (success) {
        try {
          // Verificar token y obtener información del usuario
          const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/verify`, {
            headers: {
              'Authorization': `Bearer ${callback.token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setUser(data.data.user);
            setToken(callback.token);
            
            // Mostrar mensaje de bienvenida
            const welcomeMessage = callback.newUser 
              ? `¡Bienvenido al sistema! Usuario creado automáticamente: ${data.data.user.full_name}`
              : `¡Bienvenido, ${data.data.user.full_name}!`;
            
            toast.success(welcomeMessage);
          }
        } catch (error) {
          console.error('Error verificando token CAS:', error);
          toast.error('Error procesando autenticación CAS');
        }
      }
    }
  };

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated()) {
      const redirectTo = user?.role === 'admin' ? '/admin' : '/dashboard';
      toast.success(`¡Bienvenido, ${user?.full_name}!`);
    }
  }, [isAuthenticated, user]);

  // Si ya está autenticado, redirigir
  if (isAuthenticated()) {
    const from = location.state?.from?.pathname;
    const redirectTo = from || (user?.role === 'admin' ? '/admin' : '/dashboard');
    return <Navigate to={redirectTo} replace />;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTraditionalLogin = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setLoading(true);

    try {
      const result = await login(formData.username, formData.password);
      
      if (result.success) {
        toast.success(`¡Bienvenido, ${result.user.full_name}!`);
      } else {
        toast.error(result.message || 'Error al iniciar sesión');
      }
    } catch (error) {
      console.error('Error en login:', error);
      toast.error('Error inesperado al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleCASLogin = async () => {
    setCasLoading(true);
    try {
      const currentPath = location.pathname;
      const returnUrl = location.state?.from?.pathname || '/dashboard';
      
      await casService.startLogin(returnUrl);
    } catch (error) {
      console.error('Error iniciando login CAS:', error);
      toast.error('Error iniciando autenticación CAS');
    } finally {
      setCasLoading(false);
    }
  };

  const fillDemoCredentials = (role) => {
    if (role === 'admin') {
      setFormData({
        username: 'admin',
        password: 'password123'
      });
    } else {
      setFormData({
        username: 'jperez',
        password: 'password123'
      });
    }
    toast(`Credenciales de ${role === 'admin' ? 'administrador' : 'usuario'} cargadas`, {
      icon: '📋',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className='flex justify-center mb-6'>
            <img 
              src="/logo-uc.png" 
              alt="Logo Universidad Católica" 
              className="h-40 w-100 object-contain" 
            />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Gestión de Aprobaciones Multi-Área
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-white py-8 px-6 shadow-lg rounded-lg">
          {/* Botón CAS (si está habilitado) */}
          {casEnabled && (
            <div className="mb-6">
              <button
                onClick={handleCASLogin}
                disabled={casLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {casLoading ? (
                  <InlineSpinner size="small" />
                ) : (
                  <>
                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                      <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM10 4C13.3137 4 16 6.68629 16 10C16 13.3137 13.3137 16 10 16C6.68629 16 4 13.3137 4 10C4 6.68629 6.68629 4 10 4Z" clipRule="evenodd" />
                        <path d="M10 6C8.89543 6 8 6.89543 8 8V12C8 13.1046 8.89543 14 10 14C11.1046 14 12 13.1046 12 12V8C12 6.89543 11.1046 6 10 6Z" />
                      </svg>
                    </span>
                    🏛️ Iniciar Sesión con CAS UC
                  </>
                )}
              </button>
              
              <div className="mt-4 flex items-center">
                <div className="flex-1 border-t border-gray-300" />
                <div className="px-4 text-sm text-gray-500">o continúa con credenciales locales</div>
                <div className="flex-1 border-t border-gray-300" />
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleTraditionalLogin}>
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Usuario
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Ingresa tu usuario"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Ingresa tu contraseña"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <InlineSpinner size="small" />
                ) : (
                  <>
                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                      <svg className="h-5 w-5 text-blue-500 group-hover:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    Iniciar Sesión Local
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600 mb-3">
              Credenciales de prueba (solo desarrollo):
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fillDemoCredentials('admin')}
                disabled={loading}
                className="w-full py-2 px-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                👨‍💼 Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('user')}
                disabled={loading}
                className="w-full py-2 px-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                👤 Usuario
              </button>
            </div>
          </div>

          {/* Info CAS */}
          {casEnabled && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-blue-700">
                  Usa CAS para acceder con tu cuenta institucional UC
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Universidad Católica © 2025
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;