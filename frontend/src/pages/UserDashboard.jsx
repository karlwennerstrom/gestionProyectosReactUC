// frontend/src/pages/UserDashboard.jsx - CON ESTADOS EN TIEMPO REAL
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectService, documentService, fileUtils, api } from '../services/api';
import { dateUtils } from '../services/api';
import { InlineSpinner } from '../components/Common/LoadingSpinner';
import RequirementCard from '../components/Common/RequirementCard';
import UserProjectDetailsView from '../components/User/UserProjectDetailsView';
import RequirementUploadModal from '../components/User/RequirementUploadModal';
import NotificationSettings from '../components/User/NotificationSettings';
import { stageRequirements } from '../config/stageRequirements';
import toast from 'react-hot-toast';

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRequirementModal, setShowRequirementModal] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedStage, setSelectedStage] = useState('formalization');
  const [selectedRequirement, setSelectedRequirement] = useState(null);

  // Estados para requirement cards con estados reales
  const [projectRequirements, setProjectRequirements] = useState({});
  
  // Estados para lightbox de documentos
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [newProject, setNewProject] = useState({
    title: '',
    description: ''
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando proyectos del usuario...');
      
      const response = await projectService.getMy();
      console.log('📋 Proyectos recibidos:', response.data.data.projects);
      
      // Cargar proyectos con estados reales de requerimientos
      const projectsWithRequirementData = await Promise.all(
        response.data.data.projects.map(async (project) => {
          try {
            console.log(`📊 Cargando datos para proyecto ${project.id}...`);
            
            // 1. Cargar documentos del proyecto
            const docsResponse = await documentService.getByProject(project.id);
            const documents = docsResponse.data.data.documents;
            console.log(`📄 Documentos para proyecto ${project.id}:`, documents.length);
            
            // 2. Cargar estados reales de requerimientos desde la API
            let requirementsData = [];
            try {
              console.log(`📋 Cargando estados de requerimientos para proyecto ${project.id}`);
              const reqResponse = await api.get(`/requirements/project/${project.id}`);
              
              if (reqResponse.data.success) {
                requirementsData = reqResponse.data.data.requirements;
                console.log(`✅ Estados de requerimientos cargados:`, requirementsData.length);
                
                // Guardar en el estado para uso posterior
                setProjectRequirements(prev => ({
                  ...prev,
                  [project.id]: requirementsData
                }));
              }
            } catch (reqError) {
              console.warn('⚠️ Error cargando estados de requerimientos:', reqError);
            }
            
            // 3. Analizar completitud usando los estados reales
            const requirementStats = {};
            
            Object.keys(stageRequirements).forEach(stageId => {
              const stage = stageRequirements[stageId];
              
              // Contar requerimientos por estado usando la API real
              const stageRequirementsFromAPI = requirementsData.filter(req => req.stage_name === stageId);
              
              const completedRequirements = stageRequirementsFromAPI.filter(req => req.status === 'approved').length;
              const inReviewRequirements = stageRequirementsFromAPI.filter(req => req.status === 'in-review').length;
              const rejectedRequirements = stageRequirementsFromAPI.filter(req => req.status === 'rejected').length;
              const pendingRequirements = stage.requirements.length - completedRequirements - inReviewRequirements - rejectedRequirements;
              
              requirementStats[stageId] = {
                completed: completedRequirements,
                inReview: inReviewRequirements,
                rejected: rejectedRequirements,
                pending: pendingRequirements,
                total: stage.requirements.length,
                percentage: Math.round((completedRequirements / stage.requirements.length) * 100)
              };
              
              console.log(`📊 Estadísticas REALES para etapa ${stageId}:`, requirementStats[stageId]);
            });
            
            return {
              ...project,
              documents,
              requirementStats,
              requirementsData
            };
          } catch (error) {
            console.error(`❌ Error cargando datos para proyecto ${project.id}:`, error);
            return {
              ...project,
              documents: [],
              requirementStats: {},
              requirementsData: []
            };
          }
        })
      );
      
      console.log('✅ Proyectos con datos REALES de requerimientos cargados');
      setProjects(projectsWithRequirementData);
    } catch (error) {
      console.error('❌ Error cargando proyectos:', error);
      toast.error('Error al cargar los proyectos');
    } finally {
      setLoading(false);
    }
  };

  // Función para refrescar datos después de cambios
  const refreshData = async (showToast = true) => {
    try {
      setRefreshing(true);
      await loadProjects();
      if (showToast) {
        toast.success('Datos actualizados');
      }
    } catch (error) {
      console.error('Error refrescando datos:', error);
      if (showToast) {
        toast.error('Error actualizando datos');
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Función para ver documento con lightbox - SOLO DOCUMENTO ACTUAL
  const handleViewDocument = async (requirement) => {
    try {
      setLoadingDocument(true);
      setShowDocumentModal(true);
      
      console.log('👁️ Viendo documento del requerimiento:', requirement);

      // Si el requirement tiene información del documento actual, usarla
      if (requirement.current_document_id) {
        try {
          const docResponse = await documentService.getById(requirement.current_document_id);
          if (docResponse.data.success) {
            setSelectedDocument({
              ...docResponse.data.data.document,
              requirement_info: {
                requirement_name: requirement.requirement_name,
                stage_name: requirement.stage_name,
                project_id: requirement.project_id,
                status: requirement.status
              }
            });
          }
        } catch (docError) {
          console.error('Error cargando detalles del documento:', docError);
          // Fallback: usar la información que ya tenemos
          setSelectedDocument({
            id: requirement.current_document_id,
            original_name: requirement.current_document_name,
            uploaded_at: requirement.current_document_date,
            file_size: 0,
            mime_type: 'application/octet-stream',
            requirement_info: {
              requirement_name: requirement.requirement_name,
              stage_name: requirement.stage_name,
              project_id: requirement.project_id,
              status: requirement.status
            }
          });
        }
      } else {
        toast.error('No hay documento disponible para mostrar');
        setShowDocumentModal(false);
      }
    } catch (error) {
      console.error('❌ Error mostrando documento:', error);
      toast.error('Error al cargar el documento');
      setShowDocumentModal(false);
    } finally {
      setLoadingDocument(false);
    }
  };

  const handleRequirementClick = (requirement) => {
    setSelectedProject(requirement.project_id);
    setSelectedStage(requirement.stage_name);
    setSelectedRequirement(requirement);
    setShowRequirementModal(true);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    
    if (!newProject.title.trim() || !newProject.description.trim()) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    try {
      await projectService.create(newProject);
      toast.success('Proyecto creado exitosamente');
      setShowCreateModal(false);
      setNewProject({ title: '', description: '' });
      await refreshData(false); // Refrescar sin toast adicional
    } catch (error) {
      console.error('Error creando proyecto:', error);
      toast.error(error.response?.data?.message || 'Error al crear proyecto');
    }
  };

  const handleProjectClick = (projectId) => {
    setSelectedProjectId(projectId);
    setShowProjectDetails(true);
  };

  const handleRequirementUploadSuccess = async () => {
    try {
      console.log('🔄 Actualizando datos después de subir documento...');
      await refreshData(true);
    } catch (error) {
      console.error('Error actualizando datos:', error);
    }
  };

  // Función para descargar documento
  const downloadDocument = async (documentId, fileName) => {
    try {
      await fileUtils.downloadFile(documentId, fileName);
      toast.success('Archivo descargado');
    } catch (error) {
      toast.error('Error al descargar archivo');
    }
  };

  const getStageStatus = (project, stageId) => {
    if (!project || !project.stages) return 'pending';
    
    const stage = project.stages.find(s => s.stage_name === stageId);
    return stage ? stage.status : 'pending';
  };

  const getStageComments = (project, stageId) => {
    if (!project || !project.stages) return null;
    
    const stage = project.stages.find(s => s.stage_name === stageId);
    return stage ? stage.admin_comments : null;
  };

  const getStageStatusColor = (status, completionPercentage) => {
    if (status === 'completed') return 'border-green-300 bg-green-50';
    if (status === 'rejected') return 'border-red-300 bg-red-50';
    if (status === 'in-progress') return 'border-blue-300 bg-blue-50';
    if (completionPercentage > 0) return 'border-yellow-300 bg-yellow-50';
    return 'border-gray-200 bg-gray-50';
  };

  const getStageStatusIcon = (status, completionPercentage) => {
    if (status === 'completed') return '✅';
    if (status === 'rejected') return '❌';
    if (status === 'in-progress') return '🔄';
    if (completionPercentage > 0) return '⏳';
    return '📄';
  };

  const getStageStatusText = (status, completionPercentage, stats) => {
    if (status === 'completed') return 'Etapa Aprobada';
    if (status === 'rejected') return 'Etapa Rechazada';
    if (status === 'in-progress') return 'En Revisión';
    if (completionPercentage > 0) {
      return `${stats.completed}/${stats.total} aprobados (${completionPercentage}%)`;
    }
    return 'Sin documentos';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '⏳ Pendiente';
      case 'in-progress': return '🔄 En Proceso';
      case 'approved': return '✅ Aprobado';
      case 'rejected': return '❌ Rechazado';
      default: return status;
    }
  };

  const getStageText = (stage) => {
    return stageRequirements[stage]?.name || stage;
  };

  const getStageIcon = (stage) => {
    return stageRequirements[stage]?.icon || '📄';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <InlineSpinner size="large" text="Cargando dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Mis Proyectos</h1>
                <p className="text-sm text-gray-500">Gestiona tus proyectos y requerimientos</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Botón de refrescar */}
              <button
                onClick={() => refreshData(true)}
                disabled={refreshing}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                title="Refrescar datos"
              >
                <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshing ? 'Actualizando...' : 'Refrescar'}
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Nuevo Proyecto
              </button>

              <button
                onClick={() => setShowNotificationSettings(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                title="Configurar notificaciones por email"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Notificaciones
              </button>
              
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-gray-500">Usuario</p>
              </div>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Indicador de actualización */}
        {refreshing && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center">
              <InlineSpinner size="small" />
              <span className="ml-2 text-blue-800 text-sm">Actualizando estados de requerimientos...</span>
            </div>
          </div>
        )}

        {/* Lista de Proyectos */}
        <div className="grid gap-6">
          {projects.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes proyectos</h3>
              <p className="text-gray-500 mb-4">Comienza creando tu primer proyecto</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Crear Proyecto
              </button>
            </div>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* Header del proyecto - clickeable */}
                  <div 
                    className="cursor-pointer hover:bg-gray-50 -mx-6 -mt-6 p-6 rounded-t-lg transition-colors"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors">
                            {project.title}
                          </h3>
                          <span className="text-blue-600 text-sm">
                            👁️ Ver detalles
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{project.code}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                      </div>
                      <div className="ml-4 flex flex-col items-end gap-2">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(project.status)}`}>
                          {getStatusText(project.status)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <span>{getStageIcon(project.current_stage)}</span>
                        <span>Etapa actual: <strong>{getStageText(project.current_stage)}</strong></span>
                      </div>
                      <span>Creado: {dateUtils.formatDate(project.created_at)}</span>
                    </div>
                  </div>

                  {/* Sección de requerimientos con estados reales */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-4">
                      Requerimientos por Etapa 
                      <span className="text-xs text-gray-500 ml-2">
                        (Estados en tiempo real)
                      </span>
                    </h4>
                    
                    {/* Grid de etapas con RequirementCards reales */}
                    <div className="space-y-6">
                      {Object.entries(stageRequirements).map(([stageId, stage]) => {
                        const stageStatus = getStageStatus(project, stageId);
                        const stageComments = getStageComments(project, stageId);
                        const requirementStat = project.requirementStats?.[stageId] || { 
                          completed: 0, 
                          inReview: 0,
                          rejected: 0,
                          pending: stage.requirements.length,
                          total: stage.requirements.length, 
                          percentage: 0 
                        };
                        
                        const isRejected = stageStatus === 'rejected';
                        const isApproved = stageStatus === 'completed';
                        const isInReview = stageStatus === 'in-progress';
                        
                        // Obtener requerimientos reales de la API
                        const realRequirements = projectRequirements[project.id] || project.requirementsData || [];
                        
                        return (
                          <div key={stageId} className={`border-2 rounded-lg p-4 transition-all ${
                            getStageStatusColor(stageStatus, requirementStat.percentage)
                          } ${isRejected ? 'ring-2 ring-red-200 shadow-md' : ''}`}>
                            
                            {/* Header de la etapa */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{stage.icon}</span>
                                <h5 className="text-sm font-semibold text-gray-800">{stage.name}</h5>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getStageStatusIcon(stageStatus, requirementStat.percentage)}</span>
                                <span className="text-xs font-medium text-gray-600">
                                  {requirementStat.completed}/{requirementStat.total} aprobados
                                </span>
                                {requirementStat.rejected > 0 && (
                                  <span className="text-xs font-medium text-red-600">
                                    ({requirementStat.rejected} rechazados)
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Progreso de la etapa */}
                            <div className="mb-4">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    isApproved ? 'bg-green-500' :
                                    isRejected ? 'bg-red-500' :
                                    isInReview ? 'bg-blue-500' :
                                    'bg-yellow-500'
                                  }`}
                                  style={{ width: `${requirementStat.percentage}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between items-center mt-1">
                                <span className={`text-xs font-medium ${
                                  isApproved ? 'text-green-700' :
                                  isInReview ? 'text-blue-700' :
                                  isRejected ? 'text-red-700' :
                                  'text-yellow-700'
                                }`}>
                                  {getStageStatusText(stageStatus, requirementStat.percentage, requirementStat)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {requirementStat.percentage}% completo
                                </span>
                              </div>
                            </div>

                            {/* Comentarios de la etapa */}
                            {stageComments && (
                              <div className="mb-4 p-3 bg-white rounded-lg border-l-4 border-blue-500">
                                <h6 className="font-medium text-gray-800 mb-1 text-xs">Comentarios del Administrador:</h6>
                                <p className="text-xs text-gray-600">{stageComments}</p>
                              </div>
                            )}

                            {/* Requirement Cards con estados reales */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {stage.requirements.map((requirement) => {
                                // Buscar el requerimiento real en los datos de la API
                                const realRequirement = realRequirements.find(
                                  req => req.stage_name === stageId && req.requirement_id === requirement.id
                                );

                                // Crear objeto con datos reales o defaults
                                const requirementForCard = realRequirement || {
                                  project_id: project.id,
                                  stage_name: stageId,
                                  requirement_id: requirement.id,
                                  requirement_name: requirement.name,
                                  status: 'pending',
                                  has_current_document: false,
                                  current_document_name: null,
                                  current_document_date: null,
                                  current_document_id: null,
                                  total_documents: 0,
                                  admin_comments: null,
                                  reviewed_at: null,
                                  required: requirement.required
                                };
                                
                                return (
                                  <RequirementCard
                                    key={requirement.id}
                                    requirement={requirementForCard}
                                    isAdmin={false}
                                    projectId={project.id}
                                    stageName={stageId}
                                    onViewDocuments={handleViewDocument}
                                    onUploadDocument={handleRequirementClick}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Resumen general */}
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-800 font-medium text-sm">
                          Progreso General del Proyecto
                        </span>
                        <span className="text-blue-600 text-sm font-medium">
                          {(() => {
                            const totalCompleted = Object.values(project.requirementStats || {})
                              .reduce((sum, stat) => sum + stat.completed, 0);
                            const totalRequirements = Object.values(stageRequirements)
                              .reduce((sum, stage) => sum + stage.requirements.length, 0);
                            return `${totalCompleted}/${totalRequirements} requerimientos completados`;
                          })()}
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(() => {
                              const totalCompleted = Object.values(project.requirementStats || {})
                                .reduce((sum, stat) => sum + stat.completed, 0);
                              const totalRequirements = Object.values(stageRequirements)
                                .reduce((sum, stage) => sum + stage.requirements.length, 0);
                              return Math.round((totalCompleted / totalRequirements) * 100);
                            })()}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modales - sin cambios */}
      {/* Modal Crear Proyecto */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Crear Nuevo Proyecto</h3>
            
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título del Proyecto
                </label>
                <input
                  type="text"
                  value={newProject.title}
                  onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Sistema de Gestión Académica"
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe el objetivo y alcance del proyecto..."
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Crear Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Requerimiento */}
      {showRequirementModal && selectedRequirement && (
        <RequirementUploadModal
          projectId={selectedProject}
          stageName={selectedStage}
          requirementId={selectedRequirement.requirement_id}
          onClose={() => setShowRequirementModal(false)}
          onUploadSuccess={handleRequirementUploadSuccess}
        />
      )}

      {/* Modal de Detalles del Proyecto */}
      {showProjectDetails && (
        <UserProjectDetailsView
          projectId={selectedProjectId}
          onClose={() => setShowProjectDetails(false)}
        />
      )}

      {/* Modal de Configuración de Notificaciones */}
      {showNotificationSettings && (
        <NotificationSettings
          onClose={() => setShowNotificationSettings(false)}
        />
      )}

      {/* Modal Lightbox para ver documento */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium mb-2">📄 Ver Documento</h3>
                  {selectedDocument?.requirement_info && (
                    <div className="text-blue-100 text-sm">
                      <p><strong>Requerimiento:</strong> {selectedDocument.requirement_info.requirement_name}</p>
                      <p><strong>Estado:</strong> 
                        <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                          selectedDocument.requirement_info.status === 'approved' ? 'bg-green-500 text-white' :
                          selectedDocument.requirement_info.status === 'rejected' ? 'bg-red-500 text-white' :
                          selectedDocument.requirement_info.status === 'in-review' ? 'bg-yellow-500 text-black' :
                          'bg-gray-500 text-white'
                        }`}>
                          {selectedDocument.requirement_info.status === 'approved' ? '✅ Aprobado' :
                           selectedDocument.requirement_info.status === 'rejected' ? '❌ Rechazado' :
                           selectedDocument.requirement_info.status === 'in-review' ? '🔄 En Revisión' :
                           '⏳ Pendiente'}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {loadingDocument ? (
                <div className="flex justify-center py-8">
                  <InlineSpinner text="Cargando documento..." />
                </div>
              ) : selectedDocument ? (
                <div className="space-y-4">
                  {/* Información del documento */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">
                        {fileUtils.getFileTypeIcon(selectedDocument.mime_type)}
                      </span>
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900">
                          {selectedDocument.original_name}
                        </h4>
                        <div className="text-sm text-gray-500 space-y-1">
                          {selectedDocument.uploaded_by_name && (
                            <p>Subido por: {selectedDocument.uploaded_by_name}</p>
                          )}
                          <p>Fecha: {dateUtils.formatDateTime(selectedDocument.uploaded_at)}</p>
                          {selectedDocument.file_size && (
                            <p>Tamaño: {fileUtils.formatFileSize(selectedDocument.file_size)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Estado del requerimiento */}
                  {selectedDocument.requirement_info?.status && (
                    <div className={`p-4 rounded-lg border-2 ${
                      selectedDocument.requirement_info.status === 'approved' ? 'bg-green-50 border-green-200' :
                      selectedDocument.requirement_info.status === 'rejected' ? 'bg-red-50 border-red-200' :
                      selectedDocument.requirement_info.status === 'in-review' ? 'bg-blue-50 border-blue-200' :
                      'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">
                          {selectedDocument.requirement_info.status === 'approved' ? '✅' :
                           selectedDocument.requirement_info.status === 'rejected' ? '❌' :
                           selectedDocument.requirement_info.status === 'in-review' ? '🔄' :
                           '⏳'}
                        </span>
                        <h5 className={`font-medium ${
                          selectedDocument.requirement_info.status === 'approved' ? 'text-green-800' :
                          selectedDocument.requirement_info.status === 'rejected' ? 'text-red-800' :
                          selectedDocument.requirement_info.status === 'in-review' ? 'text-blue-800' :
                          'text-yellow-800'
                        }`}>
                          {selectedDocument.requirement_info.status === 'approved' ? 'Requerimiento Aprobado' :
                           selectedDocument.requirement_info.status === 'rejected' ? 'Requerimiento Rechazado' :
                           selectedDocument.requirement_info.status === 'in-review' ? 'En Revisión por el Administrador' :
                           'Pendiente de Revisión'}
                        </h5>
                      </div>
                      
                      <p className={`text-sm ${
                        selectedDocument.requirement_info.status === 'approved' ? 'text-green-700' :
                        selectedDocument.requirement_info.status === 'rejected' ? 'text-red-700' :
                        selectedDocument.requirement_info.status === 'in-review' ? 'text-blue-700' :
                        'text-yellow-700'
                      }`}>
                        {selectedDocument.requirement_info.status === 'approved' ? 
                          '¡Excelente! Tu documento cumple con todos los requisitos.' :
                         selectedDocument.requirement_info.status === 'rejected' ? 
                          'Tu documento requiere correcciones. Revisa los comentarios del administrador y sube una nueva versión.' :
                         selectedDocument.requirement_info.status === 'in-review' ? 
                          'El administrador está revisando tu documento. Recibirás una notificación cuando se complete la revisión.' :
                          'Tu documento está en la cola de revisión.'}
                      </p>
                    </div>
                  )}

                  {/* Botón de descarga */}
                  <div className="text-center">
                    <button
                      onClick={() => downloadDocument(selectedDocument.id, selectedDocument.original_name)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Descargar Documento
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No se pudo cargar la información del documento</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowDocumentModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;