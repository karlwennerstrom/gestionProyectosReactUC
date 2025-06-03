// frontend/src/components/Common/RequirementCard.jsx - CON FLUJO DE CORRECCIONES
import React, { useState } from 'react';
import { dateUtils } from '../../services/api';

const RequirementCard = ({ 
  requirement, 
  isAdmin = false, 
  onStatusUpdate, 
  onViewDocuments,
  onUploadDocument,
  projectId,
  stageName 
}) => {
  const [showActions, setShowActions] = useState(false);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);

  // ← FUNCIÓN PARA DETECTAR SI ES UNA CORRECCIÓN
  const isCorrection = () => {
    return requirement.admin_comments && 
           requirement.admin_comments.includes('DOCUMENTO CORREGIDO');
  };

  // ← FUNCIÓN PARA DETECTAR SI FUE RECHAZADO ANTES
  const wasPreviouslyRejected = () => {
    return requirement.admin_comments && 
           (requirement.admin_comments.includes('DOCUMENTO CORREGIDO') || 
            requirement.status === 'rejected');
  };

  // ← COLORES ACTUALIZADOS PARA ESTADOS REALES
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'border-green-300 bg-green-50';
      case 'rejected': return 'border-red-300 bg-red-50';
      case 'in-review': return isCorrection() ? 'border-orange-300 bg-orange-50' : 'border-blue-300 bg-blue-50';
      case 'pending': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  // ← ICONOS ACTUALIZADOS CON CORRECCIONES
  const getStatusIcon = (status) => {
    if (isCorrection() && status === 'in-review') return '🔄';
    switch (status) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'in-review': return '🔄';
      case 'pending': return '⏳';
      default: return '📄';
    }
  };

  // ← TEXTOS ACTUALIZADOS CON CORRECCIONES
  const getStatusText = (status) => {
    if (isCorrection() && status === 'in-review') return 'Corrección En Revisión';
    switch (status) {
      case 'approved': return 'Aprobado';
      case 'rejected': return 'Rechazado';
      case 'in-review': return 'En Revisión';
      case 'pending': return 'Pendiente';
      default: return 'Sin Estado';
    }
  };

  // ← COLORES PARA BADGES DE ESTADO CON CORRECCIONES
  const getStatusBadgeColor = (status) => {
    if (isCorrection() && status === 'in-review') return 'bg-orange-100 text-orange-700 border-orange-200';
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'in-review': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === 'rejected' && !comments.trim()) {
      alert('Los comentarios son obligatorios para rechazar un requerimiento');
      return;
    }

    setProcessing(true);
    try {
      await onStatusUpdate(requirement, newStatus, comments);
      setShowActions(false);
      setComments('');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className={`border-2 rounded-lg p-4 transition-all ${getStatusColor(requirement.status)}`}>
      {/* Header del requerimiento */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getStatusIcon(requirement.status)}</span>
          <h4 className="font-medium text-gray-800 text-sm">{requirement.requirement_name}</h4>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getStatusBadgeColor(requirement.status)}`}>
            {getStatusText(requirement.status)}
          </span>
          {/* ← BADGE PARA CORRECCIONES */}
          {isCorrection() && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-200 ml-1">
              🔄 Corregido
            </span>
          )}
        </div>
      </div>

      {/* ← INFORMACIÓN DEL DOCUMENTO CON ESTADO */}
      <div className="mb-3">
        {requirement.has_current_document ? (
          <div className="space-y-2">
            {/* Información del archivo */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-green-600">📎</span>
              <span className="truncate flex-1">{requirement.current_document_name}</span>
              <span className="text-xs text-gray-500 flex-shrink-0">
                ({dateUtils.timeAgo(requirement.current_document_date)})
              </span>
            </div>
            
            {/* ← ESTADO DEL DOCUMENTO/REQUERIMIENTO CON CORRECCIONES */}
            <div className={`text-xs px-2 py-1 rounded border ${getStatusBadgeColor(requirement.status)}`}>
              <div className="flex items-center gap-1">
                <span>{getStatusIcon(requirement.status)}</span>
                <span className="font-medium">
                  {isCorrection() && requirement.status === 'in-review' ? 'Corrección Enviada a Revisión' :
                   requirement.status === 'approved' ? 'Documento Aprobado' :
                   requirement.status === 'rejected' ? 'Requiere Corrección' :
                   requirement.status === 'in-review' ? 'En Revisión' :
                   'Esperando Revisión'}
                </span>
              </div>
            </div>

            {/* Historial de versiones para admin */}
            {isAdmin && requirement.total_documents > 1 && (
              <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex-shrink-0">
                📚 {requirement.total_documents} versiones subidas
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>📄</span>
            <span>Sin documento subido</span>
            {requirement.required && (
              <span className="text-red-500 text-xs font-medium">*Obligatorio</span>
            )}
          </div>
        )}
      </div>

      {/* ← COMENTARIOS DEL ADMIN CON MEJOR DISEÑO Y CORRECCIONES */}
      {requirement.admin_comments && (
        <div className={`mb-3 p-2 rounded text-xs border-l-4 ${
          isCorrection() ? 'bg-orange-50 border-orange-400 text-orange-800' :
          requirement.status === 'approved' ? 'bg-green-50 border-green-400 text-green-800' :
          requirement.status === 'rejected' ? 'bg-red-50 border-red-400 text-red-800' :
          'bg-blue-50 border-blue-400 text-blue-800'
        }`}>
          <div className="font-medium mb-1">
            {isAdmin ? 'Tus comentarios:' : 'Comentarios del administrador:'}
          </div>
          <div>{requirement.admin_comments}</div>
          {requirement.reviewed_at && (
            <div className="text-gray-500 mt-1 text-xs">
              {dateUtils.formatDateTime(requirement.reviewed_at)}
            </div>
          )}
        </div>
      )}

      {/* ← MENSAJES ESPECÍFICOS POR ESTADO CON CORRECCIONES (solo usuarios) */}
      {!isAdmin && (
        <>
          {/* Mensaje para documento aprobado */}
          {requirement.status === 'approved' && (
            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
              <div className="text-green-800 font-medium">✅ ¡Requerimiento Aprobado!</div>
              <div className="text-green-700 mt-1">
                Tu documento cumple con todos los requisitos. Excelente trabajo.
              </div>
            </div>
          )}

          {/* Mensaje para documento rechazado */}
          {requirement.status === 'rejected' && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
              <div className="text-red-800 font-medium">⚠️ Corrección Requerida</div>
              <div className="text-red-700 mt-1">
                Tu documento requiere modificaciones. Revisa los comentarios y sube una nueva versión.
              </div>
            </div>
          )}

          {/* ← MENSAJE ESPECIAL PARA CORRECCIONES EN REVISIÓN */}
          {isCorrection() && requirement.status === 'in-review' && (
            <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
              <div className="text-orange-800 font-medium">📝 Corrección Enviada</div>
              <div className="text-orange-700 mt-1">
                Has enviado una corrección. El administrador está revisando tu nueva versión.
              </div>
            </div>
          )}

          {/* Mensaje para en revisión (no corrección) */}
          {requirement.status === 'in-review' && !isCorrection() && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <div className="text-blue-800 font-medium">🔄 En Revisión</div>
              <div className="text-blue-700 mt-1">
                El administrador está revisando tu documento. Recibirás una notificación cuando se complete.
              </div>
            </div>
          )}

          {/* Mensaje para pendiente con documento */}
          {requirement.status === 'pending' && requirement.has_current_document && (
            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <div className="text-yellow-800 font-medium">⏳ Esperando Revisión</div>
              <div className="text-yellow-700 mt-1">
                Tu documento ha sido subido y está en la cola de revisión.
              </div>
            </div>
          )}
        </>
      )}

      {/* ← MENSAJES PARA ADMIN CON CORRECCIONES */}
      {isAdmin && (
        <>
          {/* Mensaje para admin cuando es una corrección */}
          {isCorrection() && requirement.status === 'in-review' && (
            <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
              <div className="text-orange-800 font-medium">📝 Documento Corregido</div>
              <div className="text-orange-700 mt-1">
                El usuario ha subido una corrección. Requiere nueva revisión.
              </div>
            </div>
          )}
        </>
      )}

      {/* ← ACCIONES ACTUALIZADAS CON CORRECCIONES */}
      <div className="flex gap-2">
        {/* Botón para ver documentos */}
        {requirement.has_current_document && (
          <button
            onClick={() => onViewDocuments(requirement)}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
          >
            {isAdmin ? (
              <>
                📎 Ver {requirement.total_documents > 1 ? `Historial (${requirement.total_documents})` : 'Documento'}
              </>
            ) : (
              <>
                👁️ Ver Documento
              </>
            )}
          </button>
        )}

        {/* ← BOTÓN PARA SUBIR DOCUMENTO CON TEXTO DINÁMICO (solo usuarios) */}
        {!isAdmin && (
          <button
            onClick={() => onUploadDocument(requirement)}
            className={`${requirement.has_current_document ? 'flex-1' : 'w-full'} px-3 py-2 text-xs rounded-md transition-colors ${
              requirement.status === 'rejected' 
                ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                : requirement.status === 'approved'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            📤 {
              requirement.status === 'rejected' ? 'Corregir Documento' :
              requirement.status === 'approved' ? 'Actualizar Documento' :
              isCorrection() ? 'Nueva Corrección' :
              requirement.has_current_document ? 'Actualizar Documento' : 'Subir Documento'
            }
          </button>
        )}

        {/* ← ACCIONES DE ADMIN ACTUALIZADAS */}
        {isAdmin && requirement.has_current_document && (
          <div className="flex gap-1">
            {requirement.status !== 'approved' && (
              <button
                onClick={() => handleStatusUpdate('approved')}
                disabled={processing}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors disabled:opacity-50"
              >
                ✓ Aprobar
              </button>
            )}
            
            {requirement.status !== 'rejected' && (
              <button
                onClick={() => setShowActions(true)}
                disabled={processing}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md transition-colors disabled:opacity-50"
              >
                ✗ Rechazar
              </button>
            )}

            {/* Botón para volver a poner en revisión */}
            {(requirement.status === 'approved' || requirement.status === 'rejected') && (
              <button
                onClick={() => handleStatusUpdate('in-review')}
                disabled={processing}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors disabled:opacity-50"
              >
                🔄 Revisar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de acciones para rechazar */}
      {showActions && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">Rechazar Requerimiento</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Requerimiento:</strong> {requirement.requirement_name}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Proyecto:</strong> {projectId}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Etapa:</strong> {stageName}
              </p>
              {isCorrection() && (
                <p className="text-sm text-orange-600">
                  <strong>Tipo:</strong> Documento corregido
                </p>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentarios (obligatorio)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={isCorrection() 
                  ? "Explica por qué se rechaza esta corrección y qué se debe mejorar..."
                  : "Explica por qué se rechaza este requerimiento y qué se debe corregir..."
                }
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowActions(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleStatusUpdate('rejected')}
                disabled={!comments.trim() || processing}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50"
              >
                {processing ? 'Procesando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequirementCard;