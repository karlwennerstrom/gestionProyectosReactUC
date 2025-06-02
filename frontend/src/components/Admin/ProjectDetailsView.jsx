import React, { useState, useEffect } from 'react';
import { projectService, documentService, fileUtils } from '../../services/api';
import { dateUtils } from '../../services/api';
import { InlineSpinner } from '../Common/LoadingSpinner';
import toast from 'react-hot-toast';

const ProjectDetailsView = ({ projectId, onClose }) => {
  const [project, setProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStageModal, setShowStageModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [stageAction, setStageAction] = useState('');
  const [stageComments, setStageComments] = useState('');
  const [processingStage, setProcessingStage] = useState(false);

  const stages = [
    { 
      id: 'formalization', 
      name: 'Formalización',
      description: 'Validación de formalización del proyecto',
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

  const getStageCompletedDate = (stageName) => {
    if (!project || !project.stages) return null;
    
    const stage = project.stages.find(s => s.stage_name === stageName);
    return stage ? stage.completed_at : null;
  };

  const getStageDocuments = (stageName) => {
    return documents.filter(doc => doc.stage_name === stageName);
  };

  const getStageColor = (color) => {
    const colors = {
      red: 'border-red-500 bg-gradient-to-br from-red-50 to-white',
      blue: 'border-blue-500 bg-gradient-to-br from-blue-50 to-white',
      green: 'border-green-500 bg-gradient-to-br from-green-50 to-white',
      orange: 'border-orange-500 bg-gradient-to-br from-orange-50 to-white',
      purple: 'border-purple-500 bg-gradient-to-br from-purple-50 to-white'
    };
    return colors[color] || colors.blue;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">✓</div>;
      case 'in-progress':
        return <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm animate-pulse">⏳</div>;
      case 'rejected':
        return <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">✗</div>;
      default:
        return <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm">○</div>;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Aprobada';
      case 'in-progress': return 'En Revisión';
      case 'rejected': return 'Rechazada';
      default: return 'Pendiente';
    }
  };

  const handleStageAction = (stage, action) => {
    setSelectedStage(stage);
    setStageAction(action);
    setStageComments('');
    setShowStageModal(true);
  };

  const executeStageAction = async () => {
    if (!selectedStage || !stageAction) return;

    if (stageAction === 'reject' && !stageComments.trim()) {
      toast.error('Los comentarios son obligatorios para rechazar una etapa');
      return;
    }

    try {
      setProcessingStage(true);
      
      const newStatus = stageAction === 'approve' ? 'completed' : 'rejected';
      const comments = stageComments.trim() || (stageAction === 'approve' ? `Etapa ${selectedStage.name} aprobada` : '');

      await projectService.updateStage(
        project.id,
        selectedStage.id,
        newStatus,
        comments
      );

      toast.success(`Etapa ${selectedStage.name} ${stageAction === 'approve' ? 'aprobada' : 'rechazada'} exitosamente`);
      setShowStageModal(false);
      await loadProjectData(); // Recargar datos

    } catch (error) {
      console.error('Error ejecutando acción en etapa:', error);
      toast.error(error.response?.data?.message || 'Error al ejecutar la acción');
    } finally {
      setProcessingStage(false);
    }
  };

  const resetStageToReview = async (stage) => {
    try {
      await projectService.updateStage(
        project.id,
        stage.id,
        'in-progress',
        'Etapa enviada nuevamente a revisión'
      );

      toast.success(`Etapa ${stage.name} enviada a revisión`);
      await loadProjectData();

    } catch (error) {
      console.error('Error enviando etapa a revisión:', error);
      toast.error('Error al enviar etapa a revisión');
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

  const canApproveStage = (stageStatus, stageDocuments) => {
    return stageDocuments.length > 0 && (stageStatus === 'in-progress' || stageStatus === 'pending');
  };

  const canRejectStage = (stageStatus) => {
    return stageStatus === 'in-progress' || stageStatus === 'pending';
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold mb-2">Panel de Administración - Revisión de Etapas</h1>
              <p className="opacity-90">Universidad Católica - Gestión Integral de Proyectos</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Project Info */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent mb-2">
              {project.code}
            </div>
            <div className="text-lg text-gray-800 mb-3">{project.title}</div>
            <div className="flex gap-4 text-sm text-gray-600">
              <span>Iniciado: {dateUtils.formatDate(project.created_at)}</span>
              <span>Solicitante: {project.user_name}</span>
              <span>Email: {project.user_email}</span>
            </div>
          </div>

          {/* Stages */}
          <div className="grid gap-6">
            {stages.map((stage) => {
              const stageStatus = getStageStatus(stage.id);
              const stageDocuments = getStageDocuments(stage.id);
              const stageComments = getStageComments(stage.id);
              const completedDate = getStageCompletedDate(stage.id);
              
              return (
                <div key={stage.id} className={`border-2 rounded-lg p-6 ${getStageColor(stage.color)}`}>
                  {/* Stage Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`
                        px-4 py-2 text-white font-semibold rounded-lg mr-4
                        ${stage.color === 'red' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                          stage.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                          stage.color === 'green' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                          stage.color === 'orange' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                          'bg-gradient-to-r from-purple-500 to-purple-600'}
                      `}>
                        {stage.name.toUpperCase()}
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusIcon(stageStatus)}
                        <div>
                          <span className="text-sm font-medium text-gray-600">
                            {getStatusText(stageStatus)}
                          </span>
                          {completedDate && (
                            <div className="text-xs text-gray-500">
                              {dateUtils.formatDateTime(completedDate)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {canApproveStage(stageStatus, stageDocuments) && (
                        <button
                          onClick={() => handleStageAction(stage, 'approve')}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                        >
                          ✓ Aprobar
                        </button>
                      )}
                      {canRejectStage(stageStatus) && (
                        <button
                          onClick={() => handleStageAction(stage, 'reject')}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
                        >
                          ✗ Rechazar
                        </button>
                      )}
                      {stageStatus === 'rejected' && (
                        <button
                          onClick={() => resetStageToReview(stage)}
                          className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-md transition-colors"
                        >
                          🔄 Revisar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stage Comments */}
                  {stageComments && (
                    <div className="mb-4 p-3 bg-white rounded-lg border-l-4 border-blue-500">
                      <h4 className="font-medium text-gray-800 mb-1">Comentarios del Administrador:</h4>
                      <p className="text-sm text-gray-600">{stageComments}</p>
                    </div>
                  )}

                  {/* Stage Content */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Requirements */}
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">📋 Requerimientos:</h4>
                      <ul className="space-y-1">
                        {stage.requirements.map((req, reqIndex) => (
                          <li key={reqIndex} className="flex items-start text-sm text-gray-600">
                            <span className="text-gray-400 mr-2">•</span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Documents */}
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">
                        📎 Documentos ({stageDocuments.length})
                        {stageDocuments.length === 0 && (
                          <span className="text-red-500 text-xs font-normal"> - Sin documentos</span>
                        )}
                      </h4>
                      {stageDocuments.length === 0 ? (
                        <div className="text-sm text-gray-500 italic p-3 bg-white rounded-lg border border-gray-200">
                          No hay documentos subidos para esta etapa
                        </div>
                      ) : (
                        <div className="space-y-3">
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
                                    Subido por {doc.uploaded_by_name} • 
                                    {dateUtils.timeAgo(doc.uploaded_at)}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => downloadDocument(doc.id, doc.original_name)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors flex-shrink-0 ml-2"
                              >
                                Descargar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal de Acción en Etapa */}
      {showStageModal && selectedStage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {stageAction === 'approve' ? '✓ Aprobar Etapa' : '✗ Rechazar Etapa'}
            </h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Etapa:</strong> {selectedStage.name}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Proyecto:</strong> {project.title}
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentarios {stageAction === 'reject' && <span className="text-red-500">(Obligatorio)</span>}
              </label>
              <textarea
                value={stageComments}
                onChange={(e) => setStageComments(e.target.value)}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={
                  stageAction === 'approve' 
                    ? "Comentarios sobre la aprobación (opcional)..."
                    : "Explica por qué se rechaza esta etapa y qué se debe corregir..."
                }
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowStageModal(false)}
                disabled={processingStage}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={executeStageAction}
                disabled={processingStage}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 ${
                  stageAction === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processingStage ? (
                  <InlineSpinner size="small" />
                ) : (
                  stageAction === 'approve' ? 'Aprobar Etapa' : 'Rechazar Etapa'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailsView;