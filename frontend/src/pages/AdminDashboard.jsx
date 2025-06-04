// frontend/src/pages/AdminDashboard.jsx - IMPORTS CORREGIDOS
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectService, documentService, api, fileUtils } from '../services/api';
import { dateUtils } from '../services/api';
import { InlineSpinner } from '../components/Common/LoadingSpinner';
import RequirementCard from '../components/Common/RequirementCard';
import ProjectDetailsView from '../components/Admin/ProjectDetailsView';
import NotificationSettings from '../components/Admin/NotificationSettings';
import { stageRequirements } from '../config/stageRequirements';
import AIChatbot from '../components/Common/AIChatbot';
// ✅ IMPORTS CORREGIDOS - Usar ruta completa desde components
import StageManagementPanel from '../components/Admin/StageManagementPanel';
import DeletedProjectsPanel from '../components/Admin/DeletedProjectsPanel';
import toast from 'react-hot-toast';
import ProjectsExecutiveChart from '../components/Admin/ProjectsExecutiveChart';


const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  // Estados para requirement management
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [projectRequirements, setProjectRequirements] = useState({});
  const [loadingRequirements, setLoadingRequirements] = useState({});

  // Estados para modal de historial de documentos
  const [showDocumentHistoryModal, setShowDocumentHistoryModal] = useState(false);
  const [selectedRequirementDocs, setSelectedRequirementDocs] = useState([]);
  const [selectedRequirementInfo, setSelectedRequirementInfo] = useState(null);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);

  // ✅ ESTADOS PARA LOS NUEVOS MODALES
  const [showStageManagement, setShowStageManagement] = useState(false);
  const [showDeletedProjects, setShowDeletedProjects] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
const [selectedProjectToDelete, setSelectedProjectToDelete] = useState(null);
const [deleteReason, setDeleteReason] = useState('');
const [deleting, setDeleting] = useState(false);
const [projectsWithProgress, setProjectsWithProgress] = useState([]);


  useEffect(() => {
    loadData();
  }, []);
useEffect(() => {
  if (projects.length > 0) {
    const processedProjects = projects.map(calculateProjectProgress);
    setProjectsWithProgress(processedProjects);
  }
}, [projects]);
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar proyectos y estadísticas en paralelo
      const [projectsRes, statsRes] = await Promise.all([
        projectService.getAll(),
        projectService.getStats()
      ]);

      setProjects(projectsRes.data.data.projects);
      setStats(statsRes.data.data.stats);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteProject = (project) => {
  setSelectedProjectToDelete(project);
  setDeleteReason('');
  setShowDeleteModal(true);
};
const calculateProjectProgress = (project) => {
  // Calcular progreso basado en etapas completadas
  const stageOrder = ['formalization', 'design', 'delivery', 'operation', 'maintenance'];
  const currentStageIndex = stageOrder.indexOf(project.current_stage);
  
  let progress = 0;
  if (project.status === 'approved') {
    progress = 100;
  } else {
    // Progreso basado en la etapa actual (20% por etapa)
    progress = (currentStageIndex + 1) * 20;
  }
  
  return {
    ...project,
    progress,
    stages_completed: currentStageIndex + 1,
    total_stages: 5,
    days_since_created: Math.floor((new Date() - new Date(project.created_at)) / (1000 * 60 * 60 * 24)),
    documents_uploaded: project.document_count || 0,
    documents_approved: Math.floor((project.document_count || 0) * 0.7), // Estimación
    documents_rejected: Math.floor((project.document_count || 0) * 0.2), // Estimación
    priority: getPriorityLevel(project)
  };
};
const getPriorityLevel = (project) => {
  const daysSinceCreated = Math.floor((new Date() - new Date(project.created_at)) / (1000 * 60 * 60 * 24));
  const hasDocuments = (project.document_count || 0) > 0;
  
  if (project.status === 'rejected') return 'high';
  if (hasDocuments && daysSinceCreated > 14) return 'high';
  if (hasDocuments && daysSinceCreated > 7) return 'medium';
  if (hasDocuments) return 'medium';
  if (daysSinceCreated > 21) return 'high';
  if (daysSinceCreated > 10) return 'medium';
  return 'low';
};
const executeDeleteProject = async () => {
  if (!selectedProjectToDelete) return;

  try {
    setDeleting(true);
    
    const response = await api.delete(`/projects/${selectedProjectToDelete.id}`, {
      data: { reason: deleteReason.trim() || 'Eliminado por administrador' }
    });

    if (response.data.success) {
      toast.success(`Proyecto ${selectedProjectToDelete.code} eliminado exitosamente`);
      setShowDeleteModal(false);
      setSelectedProjectToDelete(null);
      setDeleteReason('');
      // Recargar datos
      await loadData();
    }
  } catch (error) {
    console.error('Error eliminando proyecto:', error);
    toast.error(error.response?.data?.message || 'Error al eliminar proyecto');
  } finally {
    setDeleting(false);
  }
};

  // Cargar requerimientos de un proyecto específico
  const loadProjectRequirements = async (projectId) => {
    if (projectRequirements[projectId]) {
      return; // Ya están cargados
    }

    try {
      setLoadingRequirements(prev => ({ ...prev, [projectId]: true }));
      
      console.log(`📋 Cargando requerimientos para proyecto ${projectId}`);
      
      // ✅ CORREGIDO: Usar api correctamente configurada
      const response = await api.get(`/requirements/project/${projectId}`);
      
      console.log('✅ Respuesta de requerimientos:', response.data);
      
      if (response.data.success) {
        setProjectRequirements(prev => ({
          ...prev,
          [projectId]: response.data.data.requirements
        }));
        console.log(`📋 Requerimientos cargados para proyecto ${projectId}:`, response.data.data.requirements.length);
      } else {
        console.error('❌ Error en respuesta:', response.data.message);
        toast.error('Error al cargar requerimientos: ' + response.data.message);
      }
    } catch (error) {
      console.error('❌ Error cargando requerimientos:', error);
      
      // Mostrar información más detallada del error
      if (error.response) {
        console.error('Response error:', error.response.status, error.response.data);
        if (error.response.status === 404) {
          toast.error('Endpoint de requerimientos no encontrado. Verifica que el servidor esté configurado correctamente.');
        } else {
          toast.error(`Error ${error.response.status}: ${error.response.data?.message || 'Error al cargar requerimientos'}`);
        }
      } else if (error.request) {
        console.error('Request error:', error.request);
        toast.error('Error de conexión al servidor');
      } else {
        console.error('Error:', error.message);
        toast.error('Error al cargar requerimientos');
      }
    } finally {
      setLoadingRequirements(prev => ({ ...prev, [projectId]: false }));
    }
  };

  // Toggle expansión de proyecto
  const toggleProjectExpansion = async (projectId) => {
    const newExpanded = new Set(expandedProjects);
    
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
      // Cargar requerimientos cuando se expande
      await loadProjectRequirements(projectId);
    }
    
    setExpandedProjects(newExpanded);
  };

  // ✅ CORREGIDO: Actualizar estado de requerimiento
  const handleRequirementStatusUpdate = async (requirement, newStatus, comments) => {
    try {
      console.log('🔄 Actualizando requerimiento:', {
        project_id: requirement.project_id,
        stage_name: requirement.stage_name,
        requirement_id: requirement.requirement_id,
        newStatus,
        comments
      });

      // ✅ USAR API EN LUGAR DE FETCH
      const response = await api.put(`/requirements/${requirement.project_id}/${requirement.stage_name}/${requirement.requirement_id}/status`, {
        status: newStatus,
        admin_comments: comments
      });

      if (response.data.success) {
        toast.success(`Requerimiento ${newStatus === 'approved' ? 'aprobado' : 'rechazado'} exitosamente`);
        
        // Actualizar los requerimientos en el estado local
        setProjectRequirements(prev => ({
          ...prev,
          [requirement.project_id]: prev[requirement.project_id]?.map(req => 
            req.project_id === requirement.project_id && 
            req.stage_name === requirement.stage_name && 
            req.requirement_id === requirement.requirement_id
              ? { ...req, status: newStatus, admin_comments: comments, reviewed_at: new Date().toISOString() }
              : req
          )
        }));

        // Recargar datos del proyecto
        await loadData();
      } else {
        toast.error(response.data.message || 'Error al actualizar requerimiento');
      }
    } catch (error) {
      console.error('Error actualizando requerimiento:', error);
      toast.error(error.response?.data?.message || 'Error al actualizar requerimiento');
    }
  };

  // ✅ CORREGIDO: Ver documentos de requerimiento CON MODAL
  const handleViewRequirementDocuments = async (requirement) => {
    try {
      setLoadingDocuments(true);
      setSelectedRequirementInfo(requirement);
      setShowDocumentHistoryModal(true);

      console.log('📄 Cargando documentos del requerimiento:', requirement);

      // ✅ USAR API EN LUGAR DE FETCH
      const response = await api.get(`/requirements/${requirement.project_id}/${requirement.stage_name}/${requirement.requirement_id}/documents`);

      if (response.data.success) {
        const documents = response.data.data.documents;
        setSelectedRequirementDocs(documents);
        console.log('Documentos del requerimiento:', documents);
      } else {
        toast.error(response.data.message || 'Error al cargar documentos');
        setSelectedRequirementDocs([]);
      }
    } catch (error) {
      console.error('Error cargando documentos del requerimiento:', error);
      toast.error(error.response?.data?.message || 'Error al cargar documentos');
      setSelectedRequirementDocs([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // ✅ CORREGIDO: Aprobar toda una etapa
  const handleApproveStage = async (projectId, stageName) => {
    if (!window.confirm(`¿Estás seguro de que quieres aprobar todos los requerimientos de la etapa ${stageName}?`)) {
      return;
    }

    try {
      console.log('✅ Aprobando etapa completa:', { projectId, stageName });

      // ✅ USAR API EN LUGAR DE FETCH
      const response = await api.put(`/requirements/${projectId}/${stageName}/approve-all`, {
        admin_comments: `Etapa ${stageName} aprobada completamente`
      });

      if (response.data.success) {
        toast.success(`Etapa ${stageName} aprobada completamente`);
        
        // Recargar requerimientos del proyecto
        delete projectRequirements[projectId];
        await loadProjectRequirements(projectId);
        await loadData();
      } else {
        toast.error(response.data.message || 'Error al aprobar etapa');
      }
    } catch (error) {
      console.error('Error aprobando etapa:', error);
      toast.error(error.response?.data?.message || 'Error al aprobar etapa');
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

  const handleViewProject = (projectId) => {
    setSelectedProjectId(projectId);
    setShowProjectDetails(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in-progress': return 'En Proceso';
      case 'approved': return 'Aprobado';
      case 'rejected': return 'Rechazado';
      default: return status;
    }
  };

  const getProjectPriority = (project) => {
    // Calcular prioridad basada en documentos pendientes y tiempo
    const daysSinceCreated = Math.floor((new Date() - new Date(project.created_at)) / (1000 * 60 * 60 * 24));
    const hasDocuments = project.document_count > 0;
    
    if (hasDocuments && daysSinceCreated > 7) return 'high';
    if (hasDocuments && daysSinceCreated > 3) return 'medium';
    if (hasDocuments) return 'normal';
    return 'low';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 font-semibold';
      case 'medium': return 'text-orange-600 font-medium';
      case 'normal': return 'text-blue-600';
      default: return 'text-gray-500';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'normal': return '🟢';
      default: return '⚪';
    }
  };

  // Obtener requerimientos agrupados por etapa
  const getRequirementsByStage = (projectId) => {
    const requirements = projectRequirements[projectId] || [];
    const grouped = {};
    
    Object.keys(stageRequirements).forEach(stageId => {
      grouped[stageId] = requirements.filter(req => req.stage_name === stageId);
    });
    
    return grouped;
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Panel de Administración</h1>
                <p className="text-sm text-gray-500">Sistema UC - Revisión de Requerimientos por Proyecto</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* <button
                onClick={() => setShowNotificationSettings(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                title="Configurar notificaciones por email"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Notificaciones
              </button> */}
              
              <button
                onClick={() => setShowChatbot(!showChatbot)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  showChatbot 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
                title="Asistente IA"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4-4-4z" />
                </svg>
                {showChatbot ? 'Cerrar Chat' : 'Asistente IA'}
              </button>
              
              <button
                onClick={() => setShowStageManagement(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                title="Gestionar etapas y requerimientos"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Gestionar Etapas
              </button>

              <button
                onClick={() => setShowDeletedProjects(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                title="Ver proyectos eliminados"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Proyectos Eliminados
              </button>
              
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-gray-500">{user?.role === 'admin' ? 'Administrador' : 'Usuario'}</p>
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

      <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <div className="h-6 w-6 text-yellow-600">⏳</div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pendientes</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <div className="h-6 w-6 text-blue-600">🔄</div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">En Proceso</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.in_progress}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <div className="h-6 w-6 text-green-600">✅</div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Aprobados</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.approved}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <div className="h-6 w-6 text-red-600">❌</div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Rechazados</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.rejected}</p>
                </div>
              </div>
            </div>
          </div>
          
        )}
        <ProjectsExecutiveChart projects={projectsWithProgress} />


        {/* Información del Nuevo Sistema */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Sistema de Revisión por Requerimientos Individuales
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Ahora puedes aprobar o rechazar cada requerimiento de forma independiente. Haz clic en "📋 Ver Requerimientos" para gestionar cada uno individualmente.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Proyectos */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Proyectos para Revisión</h3>
            <p className="text-sm text-gray-500">Gestiona los requerimientos de cada proyecto de forma independiente</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proyecto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado General
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documentos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => {
                  const priority = getProjectPriority(project);
                  const isExpanded = expandedProjects.has(project.id);
                  const requirementsByStage = getRequirementsByStage(project.id);
                  
                  return (
                    <React.Fragment key={project.id}>
                      {/* Fila principal del proyecto */}
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{project.title}</div>
                            <div className="text-sm text-gray-500">{project.code}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{project.user_name}</div>
                          <div className="text-sm text-gray-500">{project.user_email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>
                            {getStatusText(project.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-sm text-gray-900 mr-2">{project.document_count || 0}</span>
                            <span className="text-xs text-gray-500">documentos</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {dateUtils.formatDate(project.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleProjectExpansion(project.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                            >
                              {isExpanded ? '📋 Ocultar' : '📋 Ver'} Requerimientos
                            </button>
                            <button
                              onClick={() => handleViewProject(project.id)}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                            >
                              👁️ Detalles
                            </button>
                            <button
                                onClick={() => handleDeleteProject(project)}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                                title="Eliminar proyecto"
                              >
                                🗑️ Eliminar
                              </button>
                          </div>
                        </td>
                      </tr>

                      {/* Fila expandida con RequirementCards */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="6" className="px-6 py-4 bg-gray-50">
                            {loadingRequirements[project.id] ? (
                              <div className="flex justify-center py-8">
                                <InlineSpinner text="Cargando requerimientos..." />
                              </div>
                            ) : (
                              <div className="space-y-6">
                                <h4 className="text-lg font-medium text-gray-900 mb-4">
                                  Requerimientos de {project.title}
                                </h4>
                                
                                {/* Grid de etapas con requerimientos */}
                                {Object.entries(stageRequirements).map(([stageId, stage]) => {
                                  const stageRequirements_data = requirementsByStage[stageId] || [];
                                  const approvedCount = stageRequirements_data.filter(req => req.status === 'approved').length;
                                  const totalCount = stage.requirements.length;
                                  const hasDocuments = stageRequirements_data.some(req => req.has_current_document);
                                  
                                  return (
                                    <div key={stageId} className="border border-gray-200 rounded-lg p-4">
                                      {/* Header de etapa */}
                                      <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                          <span className="text-xl">{stage.icon}</span>
                                          <h5 className="text-lg font-medium text-gray-800">{stage.name}</h5>
                                          <span className="text-sm text-gray-500">
                                            ({approvedCount}/{totalCount} aprobados)
                                          </span>
                                        </div>
                                        
                                        {/* Botón para aprobar toda la etapa */}
                                        {hasDocuments && approvedCount < totalCount && (
                                          <button
                                            onClick={() => handleApproveStage(project.id, stageId)}
                                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                                          >
                                            ✅ Aprobar Etapa Completa
                                          </button>
                                        )}
                                      </div>

                                      {/* Grid de RequirementCards */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {stage.requirements.map((requirement) => {
                                          // Buscar el requerimiento en los datos cargados
                                          const requirementData = stageRequirements_data.find(
                                            req => req.requirement_id === requirement.id
                                          ) || {
                                            project_id: project.id,
                                            stage_name: stageId,
                                            requirement_id: requirement.id,
                                            requirement_name: requirement.name,
                                            status: 'pending',
                                            has_current_document: false,
                                            total_documents: 0,
                                            admin_comments: null,
                                            reviewed_at: null
                                          };

                                          return (
                                            <RequirementCard
                                              key={requirement.id}
                                              requirement={requirementData}
                                              isAdmin={true}
                                              projectId={project.id}
                                              stageName={stageId}
                                              onStatusUpdate={handleRequirementStatusUpdate}
                                              onViewDocuments={handleViewRequirementDocuments}
                                            />
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {projects.length === 0 && (
            <div className="text-center py-12">
              <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay proyectos</h3>
              <p className="text-gray-500">No hay proyectos para revisar en este momento.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalles del Proyecto */}
      {showProjectDetails && (
        <ProjectDetailsView
          projectId={selectedProjectId}
          onClose={() => {
            setShowProjectDetails(false);
            loadData(); // Recargar datos cuando se cierre el modal
          }}
        />
      )}

      {/* Modal de Configuración de Notificaciones */}
      {showNotificationSettings && (
        <NotificationSettings
          onClose={() => setShowNotificationSettings(false)}
        />
      )}

      {/* Modal de Historial de Documentos */}
      {showDocumentHistoryModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium mb-2">📄 Historial de Documentos</h3>
                  {selectedRequirementInfo && (
                    <div className="text-blue-100 text-sm">
                      <p><strong>Requerimiento:</strong> {selectedRequirementInfo.requirement_name}</p>
                      <p><strong>Proyecto:</strong> {selectedRequirementInfo.project_id}</p>
                      <p><strong>Etapa:</strong> {selectedRequirementInfo.stage_name}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowDocumentHistoryModal(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {loadingDocuments ? (
                <div className="flex justify-center py-8">
                  <InlineSpinner text="Cargando historial de documentos..." />
                </div>
              ) : selectedRequirementDocs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📄</div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Sin documentos</h4>
                  <p className="text-gray-500">No hay documentos subidos para este requerimiento</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-medium text-gray-900">
                      {selectedRequirementDocs.length} documento{selectedRequirementDocs.length !== 1 ? 's' : ''} encontrado{selectedRequirementDocs.length !== 1 ? 's' : ''}
                    </h4>
                    <span className="text-sm text-gray-500">
                      Ordenados por fecha (más reciente primero)
                    </span>
                  </div>

                  {selectedRequirementDocs.map((doc, index) => (
                    <div key={doc.id} className={`border rounded-lg p-4 ${doc.is_current ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <span className="text-2xl">
                            {fileUtils.getFileTypeIcon(doc.mime_type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-medium text-gray-900 truncate">
                                {doc.original_name || doc.name}
                              </h5>
                              {doc.is_current && (
                                <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                  Actual
                                </span>
                              )}
                              {index === 0 && !doc.is_current && (
                                <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                  Más reciente
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              <span>Subido por: {doc.uploaded_by_name || 'Usuario'}</span>
                              <span className="mx-2">•</span>
                              <span>{dateUtils.formatDateTime(doc.uploaded_at)}</span>
                              <span className="mx-2">•</span>
                              <span>{fileUtils.formatFileSize(doc.file_size || 0)}</span>
                            </div>
                            {doc.version_status && (
                              <div className="mt-1">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  doc.version_status === 'Actual' 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {doc.version_status}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => downloadDocument(doc.id, doc.original_name || doc.name)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            ⬇️ Descargar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowDocumentHistoryModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODALES NUEVOS CON RUTAS CORRECTAS */}
      {showDeleteModal && selectedProjectToDelete && (
  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-[60] p-4">
    <div className="bg-white rounded-lg max-w-md w-full">
      <div className="bg-red-600 text-white p-4 rounded-t-lg">
        <h3 className="text-lg font-medium flex items-center gap-2">
          🗑️ Eliminar Proyecto
        </h3>
      </div>
      
      <div className="p-6">
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm text-red-800">
            <p><strong>Proyecto:</strong> {selectedProjectToDelete.code}</p>
            <p><strong>Título:</strong> {selectedProjectToDelete.title}</p>
            <p><strong>Usuario:</strong> {selectedProjectToDelete.user_name}</p>
          </div>
        </div>

        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Eliminación Lógica</p>
              <p>El proyecto será marcado como eliminado pero puede ser restaurado posteriormente.</p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motivo de eliminación (opcional)
          </label>
          <textarea
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
            placeholder="Ej: Proyecto duplicado, cancelado por el cliente, etc."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowDeleteModal(false)}
            disabled={deleting}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={executeDeleteProject}
            disabled={deleting}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 flex items-center justify-center"
          >
            {deleting ? (
              <>
                <InlineSpinner size="small" />
                <span className="ml-2">Eliminando...</span>
              </>
            ) : (
              '🗑️ Eliminar Proyecto'
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
      {/* Modal de Gestión de Etapas */}
      {showStageManagement && (
        <StageManagementPanel
          onClose={() => setShowStageManagement(false)}
        />
      )}

      {/* Modal de Proyectos Eliminados */}
      {showDeletedProjects && (
        <DeletedProjectsPanel
          onClose={() => setShowDeletedProjects(false)}
        />
      )}

      {/* Chatbot */}
      <AIChatbot 
        isMinimized={!showChatbot}
        onToggle={setShowChatbot}
      />
    </div>
  );
};

export default AdminDashboard;