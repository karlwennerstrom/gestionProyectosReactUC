// frontend/src/components/Common/RequirementCard.jsx
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'border-green-300 bg-green-50';
      case 'rejected': return 'border-red-300 bg-red-50';
      case 'in-review': return 'border-blue-300 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'in-review': return '🔄';
      default: return '📄';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Aprobado';
      case 'rejected': return 'Rechazado';
      case 'in-review': return 'En Revisión';
      default: return 'Pendiente';
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
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          requirement.status === 'approved' ? 'bg-green-100 text-green-700' :
          requirement.status === 'rejected' ? 'bg-red-100 text-red-700' :
          requirement.status === 'in-review' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {getStatusText(requirement.status)}
        </span>
      </div>

      {/* Información del documento */}
      <div className="mb-3">
        {requirement.has_current_document ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-green-600">📎</span>
            <span className="truncate flex-1">{requirement.current_document_name}</span>
            <span className="text-xs text-gray-500 flex-shrink-0">
              ({dateUtils.timeAgo(requirement.current_document_date)})
            </span>
            {requirement.total_documents > 1 && isAdmin && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex-shrink-0">
                {requirement.total_documents} versiones
              </span>
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

      {/* Comentarios del admin */}
      {requirement.admin_comments && (
        <div className="mb-3 p-2 bg-white border border-gray-200 rounded text-xs">
          <div className="font-medium text-gray-700 mb-1">
            {isAdmin ? 'Comentarios:' : 'Comentarios del administrador:'}
          </div>
          <div className="text-gray-600">{requirement.admin_comments}</div>
          {requirement.reviewed_at && (
            <div className="text-gray-500 mt-1">
              {dateUtils.formatDateTime(requirement.reviewed_at)}
            </div>
          )}
        </div>
      )}

      {/* Mensaje especial para rechazados (solo usuarios) */}
      {requirement.status === 'rejected' && !isAdmin && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
          <div className="text-red-800 font-medium">⚠️ Requerimiento rechazado</div>
          <div className="text-red-700 mt-1">
            Sube un nuevo documento para enviarlo nuevamente a revisión.
          </div>
        </div>
      )}

      {/* Mensaje para en revisión (solo usuarios) */}
      {requirement.status === 'in-review' && !isAdmin && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
          <div className="text-blue-800 font-medium">🔄 En revisión</div>
          <div className="text-blue-700 mt-1">
            El administrador está revisando tu documento.
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2">
        {/* Botón para ver documentos */}
        {requirement.has_current_document && (
          <button
            onClick={() => onViewDocuments(requirement)}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
          >
            📎 Ver {isAdmin && requirement.total_documents > 1 ? `Historial (${requirement.total_documents})` : 'Documento'}
          </button>
        )}

        {/* Botón para subir documento (solo usuarios) */}
        {!isAdmin && (
          <button
            onClick={() => onUploadDocument(requirement)}
            className={`${requirement.has_current_document ? 'flex-1' : 'w-full'} px-3 py-2 text-xs rounded-md transition-colors ${
              requirement.status === 'rejected' 
                ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            📤 {requirement.has_current_document ? 'Actualizar' : 'Subir'} Documento
          </button>
        )}

        {/* Acciones de admin */}
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

            {requirement.status === 'pending' && requirement.has_current_document && (
              <button
                onClick={() => handleStatusUpdate('in-review')}
                disabled={processing}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors disabled:opacity-50"
              >
                🔄 A Revisión
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
                placeholder="Explica por qué se rechaza este requerimiento y qué se debe corregir..."
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