import React, { useState, useEffect } from 'react';
import { documentService, fileUtils } from '../../services/api';
import { dateUtils } from '../../services/api';
import { useDropzone } from 'react-dropzone';
import { InlineSpinner } from '../Common/LoadingSpinner';
import { stageRequirements } from '../../config/stageRequirements';
import toast from 'react-hot-toast';

const RequirementUploadModal = ({ 
  projectId, 
  stageName, 
  requirementId, 
  onClose, 
  onUploadSuccess 
}) => {
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const requirement = stageRequirements[stageName]?.requirements.find(
    req => req.id === requirementId
  );

  useEffect(() => {
    console.log('RequirementUploadModal props:', { projectId, stageName, requirementId });
    
    if (projectId && stageName && requirementId) {
      loadRequirementDocuments();
    }
  }, [projectId, stageName, requirementId]);

  const loadRequirementDocuments = async () => {
    try {
      setLoading(true);
      console.log('Cargando documentos para:', { projectId, stageName, requirementId });
      
      // Cargar todos los documentos del proyecto
      const response = await documentService.getByProject(projectId);
      console.log('Documentos recibidos:', response.data.data.documents);
      
      const allDocuments = response.data.data.documents;
      
      // DEBUG: Verificar estructura de documentos
      if (allDocuments.length > 0) {
        console.log('Estructura del primer documento:', allDocuments[0]);
        console.log('Campos disponibles:', Object.keys(allDocuments[0]));
      }
      
      // Filtrar documentos por etapa y requerimiento
      const requirementDocs = allDocuments.filter(doc => {
        const stageMatch = doc.stage_name === stageName;
        const requirementMatch = doc.requirement_id === requirementId;
        
        console.log(`Documento ${doc.id}:`, {
          stage_name: doc.stage_name,
          requirement_id: doc.requirement_id,
          stageMatch,
          requirementMatch,
          expectedStage: stageName,
          expectedRequirement: requirementId
        });
        
        return stageMatch && requirementMatch;
      });
      
      console.log('Documentos filtrados para requerimiento:', requirementDocs);
      
      // FALLBACK: Si no hay documentos con requirement_id, mostrar todos los de la etapa
      if (requirementDocs.length === 0) {
        console.log('No se encontraron documentos con requirement_id, mostrando todos de la etapa...');
        const stageDocs = allDocuments.filter(doc => doc.stage_name === stageName);
        console.log('Documentos de la etapa (fallback):', stageDocs);
        setDocuments(stageDocs);
      } else {
        setDocuments(requirementDocs);
      }
    } catch (error) {
      console.error('Error cargando documentos del requerimiento:', error);
      toast.error('Error al cargar documentos');
      setDocuments([]); // Establecer array vacío en caso de error
    } finally {
      setLoading(false);
    }
  };

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Validar tipo de archivo
    if (requirement?.acceptedTypes) {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      if (!requirement.acceptedTypes.includes(fileExtension)) {
        toast.error(`Tipo de archivo no permitido. Acepta: ${requirement.acceptedTypes.join(', ')}`);
        return;
      }
    }

    // Validar tamaño
    if (requirement?.maxSize) {
      const maxSizeBytes = parseSize(requirement.maxSize);
      if (file.size > maxSizeBytes) {
        toast.error(`Archivo demasiado grande. Máximo: ${requirement.maxSize}`);
        return;
      }
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('project_id', projectId);
      formData.append('stage_name', stageName);
      formData.append('requirement_id', requirementId);

      console.log('Subiendo documento:', {
        projectId,
        stageName,
        requirementId,
        fileName: file.name
      });

      const response = await documentService.upload(formData);
      console.log('Respuesta del servidor:', response.data);
      
      toast.success('Documento subido exitosamente');
      
      // Recargar documentos del requerimiento
      await loadRequirementDocuments();
      
      // Notificar al componente padre para que actualice la lista
      if (onUploadSuccess) {
        onUploadSuccess();
      }
      
    } catch (error) {
      console.error('Error subiendo documento:', error);
      toast.error(error.response?.data?.message || 'Error al subir documento');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: getAcceptObject(requirement?.acceptedTypes),
    maxSize: requirement ? parseSize(requirement.maxSize) : 10485760, // 10MB por defecto
    multiple: false
  });

  const downloadDocument = async (documentId, fileName) => {
    try {
      await fileUtils.downloadFile(documentId, fileName);
      toast.success('Archivo descargado');
    } catch (error) {
      toast.error('Error al descargar archivo');
    }
  };

  const deleteDocument = async (documentId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este documento?')) {
      return;
    }

    try {
      await documentService.delete(documentId);
      toast.success('Documento eliminado');
      await loadRequirementDocuments();
      
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error('Error eliminando documento:', error);
      toast.error('Error al eliminar documento');
    }
  };

  if (!requirement) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-medium text-red-600 mb-4">Error</h3>
          <p className="text-gray-600 mb-4">Requerimiento no encontrado.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-medium mb-2">{requirement.name}</h3>
              <p className="text-blue-100 text-sm">{requirement.description}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {requirement.acceptedTypes && (
                  <span className="bg-blue-500 bg-opacity-50 px-2 py-1 rounded">
                    Acepta: {requirement.acceptedTypes.join(', ')}
                  </span>
                )}
                {requirement.maxSize && (
                  <span className="bg-blue-500 bg-opacity-50 px-2 py-1 rounded">
                    Máx: {requirement.maxSize}
                  </span>
                )}
                {requirement.required && (
                  <span className="bg-red-500 bg-opacity-75 px-2 py-1 rounded">
                    Requerido
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Estado del requerimiento */}
          <div className="mb-6">
            {documents.length > 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <span className="text-lg">✅</span>
                <span className="font-medium">Requerimiento completado</span>
                <span className="text-sm text-gray-500">
                  ({documents.length} documento{documents.length > 1 ? 's' : ''} subido{documents.length > 1 ? 's' : ''})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-600">
                <span className="text-lg">⏳</span>
                <span className="font-medium">Requerimiento pendiente</span>
                {requirement.required && (
                  <span className="text-red-600 text-sm font-medium">(Obligatorio)</span>
                )}
              </div>
            )}
            
            {/* Información adicional del requerimiento */}
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="font-medium text-blue-800 mb-1">Sobre este requerimiento:</h5>
              <p className="text-sm text-blue-700">{requirement.description}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {requirement.acceptedTypes && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Formatos: {requirement.acceptedTypes.join(', ').toUpperCase()}
                  </span>
                )}
                {requirement.maxSize && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Tamaño máximo: {requirement.maxSize}
                  </span>
                )}
                {requirement.required && (
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                    Obligatorio
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Zona de Drop */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-800">Subir Documento</h4>
              {documents.length > 0 && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  ⚠️ Ya existe un documento. Subir uno nuevo lo reemplazará.
                </span>
              )}
            </div>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
              }`}
            >
              <input {...getInputProps()} />
              <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              {uploading ? (
                <InlineSpinner text="Subiendo archivo..." />
              ) : (
                <>
                  <p className="text-gray-600 mb-2">
                    {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra un archivo aquí o haz clic para seleccionar'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {requirement.acceptedTypes ? 
                      `Acepta: ${requirement.acceptedTypes.join(', ')} (máx. ${requirement.maxSize || '10MB'})` :
                      'Todos los tipos de archivo (máx. 10MB)'
                    }
                  </p>
                  {documents.length > 0 && (
                    <p className="text-xs text-amber-600 mt-2">
                      Nota: Este requerimiento ya tiene un documento. Subir uno nuevo reemplazará el existente.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Documentos Existentes */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">
              Documentos Subidos ({documents.length})
            </h4>
            {loading ? (
              <div className="flex justify-center py-4">
                <InlineSpinner text="Cargando documentos..." />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📄</div>
                <p>No hay documentos subidos para este requerimiento</p>
                {requirement.required && (
                  <p className="text-red-500 text-sm mt-1">
                    Este requerimiento es obligatorio
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center flex-1 min-w-0">
                      <span className="text-lg mr-3 flex-shrink-0">
                        {fileUtils.getFileTypeIcon(doc.mime_type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {doc.original_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {fileUtils.formatFileSize(doc.file_size)} • 
                          Subido por {doc.uploaded_by_name} • 
                          {dateUtils.timeAgo(doc.uploaded_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => downloadDocument(doc.id, doc.original_name)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        ⬇️ Descargar
                      </button>
                      {doc.uploaded_by === doc.uploaded_by && ( // Solo puede eliminar quien lo subió
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition-colors"
                          title="Solo puedes eliminar documentos que hayas subido"
                        >
                          🗑️ Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper functions
function parseSize(sizeStr) {
  if (!sizeStr) return 10485760; // 10MB default
  
  const units = {
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024
  };
  
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)$/i);
  if (!match) return 10485760;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  return value * units[unit];
}

function getAcceptObject(acceptedTypes) {
  if (!acceptedTypes || acceptedTypes.length === 0) {
    return {
      'application/*': [],
      'text/*': [],
      'image/*': []
    };
  }
  
  const mimeTypes = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif'
  };
  
  const acceptObject = {};
  acceptedTypes.forEach(type => {
    const mimeType = mimeTypes[type.toLowerCase()];
    if (mimeType) {
      acceptObject[mimeType] = [`.${type}`];
    }
  });
  
  return acceptObject;
}

export default RequirementUploadModal;