// frontend/src/components/CAS/CASCallback.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { InlineSpinner } from '../Common/LoadingSpinner';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

const CASCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, setToken } = useAuth();
  const [status, setStatus] = useState('processing'); // processing, success, error

  useEffect(() => {
    processCASCallback();
  }, []);

  const processCASCallback = async () => {
    try {
      const ticket = searchParams.get('ticket');
      const returnUrl = searchParams.get('returnUrl') || '/dashboard';

      console.log('🎫 Procesando callback CAS:', { ticket: ticket?.substring(0, 20) + '...', returnUrl });

      if (!ticket) {
        console.error('❌ No se recibió ticket de CAS');
        setStatus('error');
        toast.error('No se recibió ticket de autenticación de CAS');
        setTimeout(() => navigate('/login?error=no_ticket'), 2000);
        return;
      }

      // Construir la URL del servicio que debe coincidir con lo que se envió a CAS
      const serviceUrl = `${window.location.origin}/auth/cas/callback?returnUrl=${encodeURIComponent(returnUrl)}`;
      
      console.log('🔄 Validando ticket con servicio:', serviceUrl);

      // Llamar al backend para validar el ticket
      const response = await fetch(`${process.env.REACT_APP_API_URL}/cas/callback?ticket=${ticket}&returnUrl=${encodeURIComponent(returnUrl)}`, {
        method: 'GET',
        credentials: 'include'
      });

      console.log('📡 Respuesta del backend:', response.status);

      if (response.ok) {
        // Si la respuesta es exitosa, el backend debería haber redirigido
        // Pero si llegamos aquí, procesamos la respuesta
        const data = await response.json();
        console.log('✅ Datos recibidos:', data);

        if (data.success && data.token) {
          // Configurar autenticación
          localStorage.setItem('token', data.token);
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
          
          // Obtener datos del usuario
          try {
            const userResponse = await api.get('/auth/verify');
            if (userResponse.data.success) {
              setUser(userResponse.data.data.user);
              setToken(data.token);
              
              setStatus('success');
              
              // Mostrar mensaje de bienvenida
              const welcomeMessage = data.isNewUser 
                ? `¡Bienvenido al sistema! Usuario creado: ${userResponse.data.data.user.full_name}`
                : `¡Bienvenido, ${userResponse.data.data.user.full_name}!`;
              
              toast.success(welcomeMessage);
              
              // Redirigir según rol
              const finalUrl = userResponse.data.data.user.role === 'admin' ? '/admin' : '/dashboard';
              setTimeout(() => navigate(finalUrl), 1000);
            }
          } catch (userError) {
            console.error('Error obteniendo datos del usuario:', userError);
            setStatus('error');
            toast.error('Error obteniendo datos del usuario');
            setTimeout(() => navigate('/login?error=user_fetch_failed'), 2000);
          }
        } else {
          throw new Error(data.message || 'Respuesta inválida del servidor');
        }
      } else {
        // Verificar si fue una redirección del backend
        if (response.redirected) {
          console.log('🔄 Backend redirigió a:', response.url);
          window.location.href = response.url;
          return;
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error del servidor: ${response.status}`);
      }

    } catch (error) {
      console.error('❌ Error procesando callback CAS:', error);
      setStatus('error');
      toast.error(`Error en autenticación CAS: ${error.message}`);
      setTimeout(() => navigate('/login?error=cas_callback_error'), 3000);
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'processing':
        return 'Procesando autenticación CAS...';
      case 'success':
        return '¡Autenticación exitosa! Redirigiendo...';
      case 'error':
        return 'Error en la autenticación. Redirigiendo al login...';
      default:
        return 'Procesando...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return '🔄';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="max-w-md w-full">
        <div className="bg-white py-8 px-6 shadow-lg rounded-lg text-center">
          {/* Logo UC */}
          <div className='flex justify-center mb-6'>
            <img 
              src="/logo-uc.png" 
              alt="Logo Universidad Católica" 
              className="h-20 w-50 object-contain" 
            />
          </div>

          {/* Status Icon */}
          <div className="text-6xl mb-4">
            {getStatusIcon()}
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Autenticación CAS
          </h2>

          {/* Status Message */}
          <p className={`text-sm mb-6 ${getStatusColor()}`}>
            {getStatusMessage()}
          </p>

          {/* Loading Spinner for processing */}
          {status === 'processing' && (
            <div className="flex justify-center mb-4">
              <InlineSpinner size="medium" />
            </div>
          )}

          {/* Progress Steps */}
          <div className="space-y-2 text-xs text-gray-500">
            <div className={`flex items-center justify-center ${status !== 'processing' ? 'opacity-50' : ''}`}>
              <span className="w-4 h-4 bg-blue-500 rounded-full mr-2 flex items-center justify-center text-white text-xs">
                {status === 'processing' ? '⏳' : '✓'}
              </span>
              Validando ticket CAS
            </div>
            <div className={`flex items-center justify-center ${status !== 'success' && status !== 'processing' ? 'opacity-50' : ''}`}>
              <span className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center text-white text-xs ${
                status === 'success' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-gray-400'
              }`}>
                {status === 'success' ? '✓' : status === 'error' ? '✗' : '2'}
              </span>
              Configurando sesión
            </div>
            <div className={`flex items-center justify-center ${status !== 'success' ? 'opacity-50' : ''}`}>
              <span className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center text-white text-xs ${
                status === 'success' ? 'bg-green-500' : 'bg-gray-400'
              }`}>
                {status === 'success' ? '✓' : '3'}
              </span>
              Redirigiendo al dashboard
            </div>
          </div>

          {/* Error Actions */}
          {status === 'error' && (
            <div className="mt-6 space-y-2">
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Volver al Login
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 text-xs text-gray-500">
            <p>Universidad Católica © 2025</p>
            <p>Sistema de Gestión de Proyectos</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CASCallback;