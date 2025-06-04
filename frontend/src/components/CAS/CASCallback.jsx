// frontend/src/components/CAS/CASCallback.jsx - CORREGIDO
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
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    processCASCallback();
  }, []);

  const processCASCallback = async () => {
    try {
      const ticket = searchParams.get('ticket');
      const returnUrl = searchParams.get('returnUrl') || '/dashboard';

      console.log('🎫 Procesando callback CAS:', { 
        ticket: ticket?.substring(0, 20) + '...', 
        returnUrl,
        fullUrl: window.location.href 
      });

      if (!ticket) {
        console.error('❌ No se recibió ticket de CAS');
        setStatus('error');
        toast.error('No se recibió ticket de autenticación de CAS');
        setTimeout(() => navigate('/login?error=no_ticket'), 2000);
        return;
      }

      console.log('🔄 Enviando ticket al backend para validación...');

      // ✅ USAR LA API CONFIGURADA EN LUGAR DE FETCH DIRECTO
      const response = await api.get('/cas/callback', {
        params: {
          ticket: ticket,
          returnUrl: returnUrl
        }
      });

      console.log('✅ Respuesta del backend recibida:', response.data);

      if (response.data.success && response.data.token) {
        // Configurar autenticación
        localStorage.setItem('token', response.data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        // Establecer usuario y token en el contexto
        setUser(response.data.user);
        setToken(response.data.token);
        
        setStatus('success');
        
        // Mostrar mensaje de bienvenida
        const welcomeMessage = response.data.isNewUser 
          ? `¡Bienvenido al sistema! Usuario creado: ${response.data.user.full_name}`
          : `¡Bienvenida de vuelta, ${response.data.user.full_name}!`;
        
        toast.success(welcomeMessage);
        
        // Redirigir según rol
        const finalUrl = response.data.user.role === 'admin' ? '/admin' : '/dashboard';
        console.log(`🎯 Redirigiendo a: ${finalUrl}`);
        
        setTimeout(() => navigate(finalUrl, { replace: true }), 1500);
      } else {
        throw new Error(response.data.message || 'Respuesta inválida del servidor');
      }

    } catch (error) {
      console.error('❌ Error procesando callback CAS:', error);
      setStatus('error');
      
      let errorMessage = 'Error en autenticación CAS';
      
      if (error.response) {
        const errorData = error.response.data;
        console.error('Error del backend:', errorData);
        
        switch (errorData.error) {
          case 'no_ticket':
            errorMessage = 'No se recibió ticket de autenticación';
            break;
          case 'cas_validation_failed':
            errorMessage = 'Error validando con CAS: ' + (errorData.details || 'Ticket inválido');
            break;
          case 'user_not_authorized':
            errorMessage = 'Usuario no autorizado: ' + (errorData.details || 'Contacta al administrador');
            break;
          case 'cas_callback_error':
            errorMessage = 'Error en callback CAS: ' + (errorData.details || 'Error interno');
            break;
          default:
            errorMessage = errorData.message || 'Error desconocido';
        }
      } else if (error.request) {
        errorMessage = 'Error de conexión con el servidor';
      } else {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { duration: 6000 });
      setTimeout(() => navigate('/login?error=cas_callback_error'), 3000);
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'processing':
        return 'Validando credenciales con CAS UC...';
      case 'success':
        return '¡Autenticación exitosa! Redirigiendo al dashboard...';
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
            🏛️ Autenticación CAS UC
          </h2>

          {/* Status Message */}
          <p className={`text-sm mb-6 ${getStatusColor()}`}>
            {getStatusMessage()}
          </p>

          {/* Loading Spinner for processing */}
          {status === 'processing' && (
            <div className="flex justify-center mb-6">
              <InlineSpinner size="medium" />
            </div>
          )}

          {/* Progress Steps */}
          <div className="space-y-3 text-xs text-gray-600 mb-6">
            <div className={`flex items-center justify-center transition-opacity ${
              status === 'processing' ? 'opacity-100' : 'opacity-70'
            }`}>
              <span className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center text-white text-xs ${
                status !== 'error' ? 'bg-blue-500' : 'bg-red-500'
              }`}>
                {status === 'processing' ? '1' : status === 'error' ? '✗' : '✓'}
              </span>
              <span>Validando ticket con CAS UC</span>
            </div>
            
            <div className={`flex items-center justify-center transition-opacity ${
              status === 'success' ? 'opacity-100' : 'opacity-50'
            }`}>
              <span className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center text-white text-xs ${
                status === 'success' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-gray-400'
              }`}>
                {status === 'success' ? '✓' : status === 'error' ? '✗' : '2'}
              </span>
              <span>Configurando sesión de usuario</span>
            </div>
            
            <div className={`flex items-center justify-center transition-opacity ${
              status === 'success' ? 'opacity-100' : 'opacity-50'
            }`}>
              <span className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center text-white text-xs ${
                status === 'success' ? 'bg-green-500' : 'bg-gray-400'
              }`}>
                {status === 'success' ? '✓' : '3'}
              </span>
              <span>Redirigiendo al sistema</span>
            </div>
          </div>

          {/* Success Message */}
          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center text-green-800">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Autenticación exitosa con CAS UC</span>
              </div>
            </div>
          )}

          {/* Error Actions */}
          {status === 'error' && (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center text-red-800">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Error en autenticación CAS</span>
                </div>
              </div>
              
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                🔙 Volver al Login
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                🔄 Reintentar Autenticación
              </button>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-6 text-xs text-gray-500">
            <p>¿Problemas con el acceso?</p>
            <p>Contacta al soporte técnico UC</p>
          </div>

          {/* Footer */}
          <div className="mt-4 text-xs text-gray-400">
            <p>Universidad Católica © 2025</p>
            <p>Sistema de Gestión de Proyectos v2.1</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CASCallback;