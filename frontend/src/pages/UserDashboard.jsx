// frontend/src/pages/UserDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectService, documentService, fileUtils } from '../services/api';
import { dateUtils } from '../services/api';
import { InlineSpinner } from '../components/Common/LoadingSpinner';
import RequirementCard from '../components/Common/RequirementCard'; // ← NUEVO IMPORT
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

  // ← NUEVOS ESTADOS PARA REQUIREMENT CARDS
  const [projectRequirements, setProjectRequirements] = useState({});
  const [showRequirementDetails, setShowRequirementDetails] = useState(false);
  const [selectedRequirementForView, setSelectedRequirementForView] = useState(null);

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
      console.log('Cargando proyectos del usuario...');
      
      const response = await projectService.getMy();
      console.log('Proyectos recibidos:', response.data.data.projects);
      
      // Para cada proyecto, obtener también sus documentos para mostrar el estado
      const projectsWithRequirementData = await Promise.all(
        response.data.data.projects.map(async (project) => {
          try {
            console.log(`Cargando documentos para proyecto ${project.id}...`);
            const docsResponse = await documentService.getByProject(project.id);
            const documents = docsResponse.data.data.documents;
            console.log(`Documentos para proyecto ${project.id}:`, documents);
            
            // ← NUEVO: Cargar requerimientos del proyecto
            const requirementsData = {};
            try {
              const reqResponse = await fetch(`/api/requirements/project/${project.id}`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              });
              if (reqResponse.ok) {
                const reqData = await reqResponse.json();
                requirementsData[project.id] = reqData.data.requirements;
              }
            } catch (reqError) {
              console.warn('No se pudieron cargar requerimientos:', reqError);
            }
            
            // Analizar completitud de requerimientos por etapa
            const requirementStats = {};
            
            Object.keys(stageRequirements).forEach(stageId => {
              const stage = stageRequirements[stageId];
              
              // CORREGIDO: Contar requerimientos completados de forma más precisa
              const completedRequirements = stage.requirements.filter(req => {
                const hasDoc = documents.some(doc => 
                  doc.stage_name === stageId && 
                  doc.requirement_id === req.id &&
                  doc.requirement_id !== null &&
                  doc.requirement_id !== undefined &&
                  doc.requirement_id !== ''
                );
                console.log(`📋 Requerimiento ${req.id} en etapa ${stageId}: ${hasDoc ? 'COMPLETADO' : 'PENDIENTE'}`);
                return hasDoc;
              }).length;
              
              requirementStats[stageId] = {
                completed: completedRequirements,
                total: stage.requirements.length,
                percentage: Math.round((completedRequirements / stage.requirements.length) * 100)
              };
              
              console.log(`Estadísticas para etapa ${stageId}:`, requirementStats[stageId]);
            });
            
            return {
              ...project,
              documents,
              requirementStats
            };
          } catch (error) {
            console.error(`Error cargando documentos para proyecto ${project.id}:`, error);
            return {
              ...project,
              documents: [],
              requirementStats: {}
            };
          }
        })
      );
      
      console.log('Proyectos con datos de requerimientos:', projectsWithRequirementData);
      setProjects(projectsWithRequirementData);
    } catch (error) {
      console.error('Error cargando proyectos:', error);
      toast.error('Error al cargar los proyectos');
    } finally {
      setLoading(false);
    }
  };

  // ← NUEVAS FUNCIONES PARA REQUIREMENT CARDS
  const loadProjectRequirements = async (projectId) => {
    try {
      const response = await fetch(`/api/requirements/project/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjectRequirements(prev => ({
          ...prev,
          [projectId]: data.data.requirements
        }));
      }
    } catch (error) {
      console.error('Error cargando requerimientos:', error);
    }
  };

  const handleViewDocuments = (requirement) => {
    setSelectedRequirementForView(requirement);
    setShowRequirementDetails(true);
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
      loadProjects();
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
      // Recargar solo los datos necesarios sin recargar toda la página
      console.log('Actualizando datos después de subir documento...');
      await loadProjects();
    } catch (error) {
      console.error('Error actualizando datos:', error);
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

  const getStageDocuments = (project, stageName) => {
    return project.documents ? project.documents.filter(doc => doc.stage_name === stageName) : [];
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

  const getStageStatusText = (status, completionPercentage) => {
    if (status === 'completed') return 'Aprobada';
    if (status === 'rejected') return 'Rechazada';
    if (status === 'in-progress') return 'En revisión';
    if (completionPercentage > 0) return `${completionPercentage}% completo`;
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
      {/* Header - SIN CAMBIOS */}
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

                  {/* ← SECCIÓN COMPLETAMENTE NUEVA: REQUERIMIENTOS CON REQUIREMENT CARDS */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-4">Requerimientos por Etapa</h4>
                    
                    {/* Grid de etapas con RequirementCards */}
                    <div className="space-y-6">
                      {Object.entries(stageRequirements).map(([stageId, stage]) => {
                        const stageStatus = getStageStatus(project, stageId);
                        const stageComments = getStageComments(project, stageId);
                        const requirementStat = project.requirementStats?.[stageId] || { completed: 0, total: stage.requirements.length, percentage: 0 };
                        const isRejected = stageStatus === 'rejected';
                        const isApproved = stageStatus === 'completed';
                        const isInReview = stageStatus === 'in-progress';
                        
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
                                  {requirementStat.completed}/{requirementStat.total} completados
                                </span>
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
                                  {getStageStatusText(stageStatus, requirementStat.percentage)}
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

                            {/* ← AQUÍ ESTÁN LOS REQUIREMENT CARDS */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {stage.requirements.map((requirement) => {
                                // Crear objeto requirement compatible con RequirementCard
                                const hasDocument = project.documents?.some(
                                  doc => doc.stage_name === stageId && 
                                         doc.requirement_id === requirement.id &&
                                         doc.requirement_id !== null &&
                                         doc.requirement_id !== undefined &&
                                         doc.requirement_id !== ''
                                );
                                
                                const currentDoc = project.documents?.find(
                                  doc => doc.stage_name === stageId && 
                                         doc.requirement_id === requirement.id
                                );

                                const requirementForCard = {
                                  project_id: project.id,
                                  stage_name: stageId,
                                  requirement_id: requirement.id,
                                  requirement_name: requirement.name,
                                  status: hasDocument ? 'in-review' : 'pending', // Por ahora, hasta conectar con la nueva API
                                  has_current_document: hasDocument,
                                  current_document_name: currentDoc?.original_name,
                                  current_document_date: currentDoc?.uploaded_at,
                                  total_documents: project.documents?.filter(
                                    doc => doc.stage_name === stageId && doc.requirement_id === requirement.id
                                  ).length || 0,
                                  admin_comments: null, // Se cargará con la nueva API
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
                                    onViewDocuments={handleViewDocuments}
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
                              return (totalCompleted / totalRequirements) * 100;
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

      {/* MODALES - SIN CAMBIOS */}
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
    </div>
  );
};

export default UserDashboard;