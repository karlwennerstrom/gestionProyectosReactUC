import React, { useState, useEffect } from 'react';
import { projectService, documentService, fileUtils } from '../../services/api';
import { dateUtils } from '../../services/api';
import { InlineSpinner } from '../Common/LoadingSpinner';
import toast from 'react-hot-toast';

const UserProjectDetailsView = ({ projectId, onClose }) => {
  const [project, setProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const stages = [
    { 
      id: 'formalization', 
      name: 'Formalización',
      description: 'Validación inicial del proyecto',
      icon: '📋',
      color: 'red',
      requirements: [
        'Ficha Formalización de Proyecto',
        'Aprobación de Formalización (GO)',
        'Código de proyecto asignado',
        'Presupuesto y Operación validado'
      ]
    },
    { 
      id: 'design', 
      name: 'Diseño y Validación',
      description: 'Validaciones técnicas de diseño',
      icon: '🎨',
      color: 'blue',
      requirements: [
        'Requerimientos Técnicos y Operacionales',
        'Documento de especificación funcional',
        'Planificación Definitiva',
        'Aprobación de Arquitectura',
        'Aprobación de Infraestructura',
        'Aprobación de Diseño (GO)'
      ]
    },
    { 
      id: 'delivery', 
      name: 'Entrega y Configuración',
      description: 'Validación de entregas y ambientes',
      icon: '🚀',
      color: 'green',
      requirements: [
        'Ficha Solicitud Creación de Ambientes',
        'Documento de Diseño y evidencia de pruebas',
        'Aprobación política tratamiento de datos',
        'Aprobación Escenarios de Prueba (JCPS)',
        'Aprobación de Ambientes (GO)'
      ]
    },
    { 
      id: 'operation', 
      name: 'Aceptación Operacional',
      description: 'Validación operacional del sistema',
      icon: '⚙️',
      color: 'orange',
      requirements: [
        'Documentación Soporte y Manual de Usuarios',
        'Documento configuraciones técnicas e instalación',
        'Documento de Diseño y evidencia de pruebas',
        'Documento Plan de Puesta en Producción',
        'Documentos Mesa de Ayuda',
        'Documento Evidencia de Capacitaciones',
        'Aprobación uso Kit Digital'
      ]
    },
    { 
      id: 'maintenance', 
      name: 'Operación y Mantenimiento',
      description: 'Marcha blanca y cierre del proyecto',
      icon: '🔧',
      color: 'purple',
      requirements: [
        'Backlog Requerimientos Pendientes',
        'Cierre de Proyecto',
        'Aprobación de Cierre (GO)',
        'Pendientes de Implementación',
        'Documentación de cierre',
        'Tareas de Operación'
      ]
    }
  ];

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const [projectRes, documentsRes] = await Promise.all([
        projectService.getById(projectId),
        documentService.getByProject(projectId)
      ]);

      setProject(projectRes.data.data.project);
      setDocuments(documentsRes.data.data.documents);
    } catch (error) {
      console.error('Error cargando datos del proyecto:', error);
      toast.error('Error al cargar los datos del proyecto');
    } finally {
      setLoading(false);
    }
  };

  const getStageStatus = (stageName) => {
    if (!project || !project.stages) return 'pending';
    
    const stage = project.stages.find(s => s.stage_name === stageName);
    return stage ? stage.status : 'pending';
  };

  const getStageComments = (stageName) => {
    if (!project || !project.stages) return null;
    
    const stage = project.stages.find(s => s.stage_name === stageName);
    return stage ? stage.admin_comments : null;
  };

  const getStageDocuments = (stageName) => {
    return documents.filter(doc => doc.stage_name === stageName);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">✓</div>;
      case 'in-progress':
        return <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white animate-pulse">●</div>;
      case 'rejected':
        return <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">✗</div>;
      default:
        return <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white">○</div>;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'in-progress': return 'En Progreso';
      case 'rejected': return 'Rechazada';
      default: return 'Pendiente';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in-progress': return 'text-blue-600';
      case 'rejected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const downloadDocument = async (documentId, fileName) => {
    try {
      await fileUtils.downloadFile(documentId, fileName);
      toast.success('Archivo descargado');
    } catch (error) {
      toast.error('Error al descargar archivo');
    }
  };

  const getCurrentStageIndex = () => {
    const currentStage = project?.current_stage;
    return stages.findIndex(stage => stage.id === currentStage);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <InlineSpinner size="large" text="Cargando proyecto..." />
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const currentStageIndex = getCurrentStageIndex();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold mb-2">{project.title}</h1>
              <p className="text-blue-100 mb-2">{project.code}</p>
              <p className="text-blue-200 text-sm">{project.description}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Project Status */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Estado del Proyecto</label>
                <div className={`text-lg font-semibold ${
                  project.status === 'approved' ? 'text-green-600' :
                  project.status === 'in-progress' ? 'text-blue-600' :
                  project.status === 'rejected' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {project.status === 'approved' ? '✅ Aprobado' :
                   project.status === 'in-progress' ? '🔄 En Proceso' :
                   project.status === 'rejected' ? '❌ Rechazado' :
                   '⏳ Pendiente'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Etapa Actual</label>
                <div className="text-lg font-semibold text-gray-900">
                  {stages.find(s => s.id === project.current_stage)?.name || 'No definida'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Progreso</label>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-3 mr-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${((currentStageIndex + 1) / stages.length) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {currentStageIndex + 1}/{stages.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline de Etapas */}
          <div className="space-y-8">
            {stages.map((stage, index) => {
              const stageStatus = getStageStatus(stage.id);
              const stageDocuments = getStageDocuments(stage.id);
              const isCurrentStage = project.current_stage === stage.id;
              const isPastStage = index < currentStageIndex;
              const isFutureStage = index > currentStageIndex;
              
              return (
                <div key={stage.id} className="relative">
                  {/* Timeline connector */}
                  {index < stages.length - 1 && (
                    <div className={`absolute left-4 top-16 w-0.5 h-16 ${
                      isPastStage ? 'bg-green-400' : 
                      isCurrentStage ? 'bg-blue-400' : 
                      'bg-gray-300'
                    }`}></div>
                  )}
                  
                  <div className={`border-2 rounded-lg p-6 ${
                    isCurrentStage ? 'border-blue-500 bg-blue-50' :
                    isPastStage ? 'border-green-500 bg-green-50' :
                    'border-gray-300 bg-gray-50'
                  }`}>
                    {/* Stage Header */}
                    <div className="flex items-center mb-4">
                      <div className="mr-4">
                        {getStatusIcon(stageStatus)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{stage.icon}</span>
                          <h3 className="text-lg font-semibold text-gray-900">{stage.name}</h3>
                          {isCurrentStage && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                              Etapa Actual
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{stage.description}</p>
                        <p className={`text-sm font-medium mt-1 ${getStatusColor(stageStatus)}`}>
                          Estado: {getStatusText(stageStatus)}
                        </p>
                      </div>
                    </div>

                    {/* Requirements */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-800 mb-3">📋 Requerimientos:</h4>
                        <ul className="space-y-2">
                          {stage.requirements.map((req, reqIndex) => (
                            <li key={reqIndex} className="flex items-start text-sm text-gray-600">
                              <span className="text-gray-400 mr-2 mt-1">•</span>
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Documents */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-800">
                            📎 Documentos ({stageDocuments.length})
                          </h4>
                          {stageStatus === 'rejected' && (
                            <button
                              onClick={() => window.location.href = '/dashboard'}
                              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded-md transition-colors"
                            >
                              🔄 Subir Nuevo Documento
                            </button>
                          )}
                        </div>

                        {/* Mensaje de etapa rechazada */}
                        {stageStatus === 'rejected' && (
                          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center mb-2">
                              <span className="text-red-600 font-medium text-sm">❌ Etapa Rechazada</span>
                            </div>
                            {(() => {
                              const comments = getStageComments(stage.id);
                              return comments && (
                                <p className="text-sm text-red-700">
                                  <strong>Motivo:</strong> {comments}
                                </p>
                              );
                            })()}
                            <p className="text-xs text-red-600 mt-1">
                              Puedes subir nuevos documentos para esta etapa y será enviada automáticamente a revisión.
                            </p>
                          </div>
                        )}

                        {/* Mensaje de etapa aprobada */}
                        {stageStatus === 'completed' && (
                          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center mb-2">
                              <span className="text-green-600 font-medium text-sm">✅ Etapa Aprobada</span>
                            </div>
                            {(() => {
                              const comments = getStageComments(stage.id);
                              return comments && (
                                <p className="text-sm text-green-700">
                                  <strong>Comentarios:</strong> {comments}
                                </p>
                              );
                            })()}
                          </div>
                        )}

                        {/* Mensaje de etapa en revisión */}
                        {stageStatus === 'in-progress' && (
                          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center">
                              <span className="text-blue-600 font-medium text-sm">🔄 En Revisión</span>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">
                              Los documentos de esta etapa están siendo revisados por el administrador.
                            </p>
                          </div>
                        )}

                        {stageDocuments.length === 0 ? (
                          <div className="text-sm text-gray-500 italic p-3 bg-white rounded-lg border border-gray-200">
                            No hay documentos subidos para esta etapa
                            {stageStatus === 'rejected' && (
                              <div className="mt-2 text-orange-600 font-medium">
                                Esta etapa fue rechazada. Necesitas subir nuevos documentos.
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {stageDocuments.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
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
                                      {dateUtils.timeAgo(doc.uploaded_at)}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => downloadDocument(doc.id, doc.original_name)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors flex-shrink-0 ml-2"
                                >
                                  ⬇️
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Project Info Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <strong>Fecha de Creación:</strong> {dateUtils.formatDate(project.created_at)}
              </div>
              <div>
                <strong>Total de Documentos:</strong> {documents.length}
              </div>
            </div>
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

export default UserProjectDetailsView;