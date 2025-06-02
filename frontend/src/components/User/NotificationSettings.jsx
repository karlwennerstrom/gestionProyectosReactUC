import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { InlineSpinner } from '../Common/LoadingSpinner';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

const NotificationSettings = ({ onClose }) => {
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState(user?.email || '');
  const isAdmin = user?.role === 'admin';

  const handleTestEmail = async (e) => {
    e.preventDefault();
    
    if (!testEmail.trim()) {
      toast.error('Por favor ingresa un email');
      return;
    }

    setTesting(true);

    try {
      const response = await api.post('/email/test', { email: testEmail });
      
      if (response.data.success) {
        toast.success('¡Email de prueba enviado exitosamente! Revisa tu bandeja de entrada.');
      } else {
        toast.error(response.data.message || 'Error enviando email de prueba');
      }
    } catch (error) {
      console.error('Error enviando email de prueba:', error);
      toast.error(error.response?.data?.message || 'Error enviando email de prueba');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            📧 Configuración de Notificaciones
            {isAdmin && <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Admin</span>}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Información del sistema */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">🔔 Sistema de Notificaciones Activo</h4>
          <p className="text-blue-700 text-sm mb-3">
            El sistema enviará automáticamente notificaciones por email en los siguientes casos:
          </p>
          <ul className="text-blue-700 text-sm space-y-1">
            {!isAdmin && (
              <>
                <li>✅ <strong>Etapa Aprobada:</strong> Cuando el admin apruebe una etapa de tu proyecto</li>
                <li>❌ <strong>Etapa Rechazada:</strong> Cuando una etapa requiera correcciones</li>
                <li>📄 <strong>Documento Subido:</strong> Confirmación cuando subas un documento</li>
              </>
            )}
            {isAdmin && (
              <>
                <li>📄 <strong>Documento Subido:</strong> Notificación cuando un usuario suba un documento</li>
                <li>👤 <strong>Nuevos Proyectos:</strong> Cuando se creen nuevos proyectos</li>
                <li>⏰ <strong>Pendientes de Revisión:</strong> Recordatorio de etapas pendientes</li>
              </>
            )}
          </ul>
        </div>

        {/* Configuración específica para Admin */}
        {isAdmin && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h4 className="font-medium text-orange-800 mb-2">👨‍💼 Configuración de Administrador</h4>
            <div className="text-sm text-orange-700 space-y-2">
              <p><strong>Email admin configurado:</strong> {process.env.REACT_APP_ADMIN_EMAIL || 'No configurado'}</p>
              <p><strong>Notificaciones automáticas:</strong> Habilitadas</p>
              <p className="text-xs mt-2">
                💡 <strong>Tip:</strong> Todas las notificaciones de documentos subidos se envían automáticamente a tu email.
              </p>
            </div>
          </div>
        )}

        {/* Test de email */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-800 mb-3">🧪 Probar Sistema de Email</h4>
          <p className="text-gray-600 text-sm mb-4">
            Envía un email de prueba para verificar que las notificaciones están funcionando correctamente.
          </p>
          
          <form onSubmit={handleTestEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email de prueba:
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="tu-email@ejemplo.com"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={testing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? (
                <div className="flex items-center justify-center">
                  <InlineSpinner size="small" />
                  <span className="ml-2">Enviando...</span>
                </div>
              ) : (
                '📧 Enviar Email de Prueba'
              )}
            </button>
          </form>
        </div>

        {/* Información de configuración */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">⚙️ Configuración del Sistema</h4>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Email configurado:</strong> {user?.email}</p>
            <p><strong>Nombre:</strong> {user?.full_name}</p>
            <p><strong>Rol:</strong> {user?.role === 'admin' ? 'Administrador' : 'Usuario'}</p>
            <p><strong>Notificaciones:</strong> Habilitadas</p>
          </div>
        </div>

        {/* Tipos de notificaciones */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-800 mb-3">📋 Tipos de Notificaciones</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isAdmin && (
              <>
                <div className="p-3 border border-green-200 bg-green-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="text-green-600 text-lg mr-2">✅</span>
                    <span className="font-medium text-green-800">Etapa Aprobada</span>
                  </div>
                  <p className="text-green-700 text-xs">
                    Notificación cuando una etapa de tu proyecto sea aprobada por el administrador.
                  </p>
                </div>
                
                <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="text-red-600 text-lg mr-2">❌</span>
                    <span className="font-medium text-red-800">Etapa Rechazada</span>
                  </div>
                  <p className="text-red-700 text-xs">
                    Notificación con comentarios sobre qué corregir cuando una etapa sea rechazada.
                  </p>
                </div>
              </>
            )}
            
            <div className="p-3 border border-blue-200 bg-blue-50 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="text-blue-600 text-lg mr-2">📄</span>
                <span className="font-medium text-blue-800">
                  {isAdmin ? 'Documento Subido (Admin)' : 'Documento Subido'}
                </span>
              </div>
              <p className="text-blue-700 text-xs">
                {isAdmin 
                  ? 'Notificación cuando un usuario sube un documento que requiere tu revisión.'
                  : 'Confirmación cuando subas un documento exitosamente al sistema.'
                }
              </p>
            </div>
            
            <div className="p-3 border border-purple-200 bg-purple-50 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="text-purple-600 text-lg mr-2">
                  {isAdmin ? '⏰' : '👨‍💼'}
                </span>
                <span className="font-medium text-purple-800">
                  {isAdmin ? 'Recordatorios' : 'Comunicación Admin'}
                </span>
              </div>
              <p className="text-purple-700 text-xs">
                {isAdmin 
                  ? 'Recordatorios automáticos de etapas pendientes de revisión.'
                  : 'Comunicación directa del administrador sobre el estado de tus proyectos.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Configuración adicional para admins */}
        {isAdmin && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">💡 Configuración Avanzada</h4>
            <div className="text-sm text-yellow-700 space-y-2">
              <p><strong>Variables de entorno requeridas:</strong></p>
              <ul className="list-disc list-inside text-xs space-y-1">
                <li><code>SMTP_USER</code> - Email del servidor SMTP</li>
                <li><code>SMTP_PASS</code> - Contraseña o App Password</li>
                <li><code>ADMIN_EMAIL</code> - Tu email para recibir notificaciones</li>
                <li><code>FRONTEND_URL</code> - URL del frontend para links en emails</li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;