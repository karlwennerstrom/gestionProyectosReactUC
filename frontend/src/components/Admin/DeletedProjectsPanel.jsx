// frontend/src/components/Admin/DeletedProjectsPanel.jsx
import React, { useState, useEffect } from 'react';
import { api, dateUtils } from '../../services/api';
import { InlineSpinner } from '../Common/LoadingSpinner';
import toast from 'react-hot-toast';

const DeletedProjectsPanel = ({ onClose }) => {
  const [deletedProjects, setDeletedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    loadDeletedProjects();
  }, []);

  const loadDeletedProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects/deleted');
      if (response.data.success) {
        setDeletedProjects(response.data.data.projects);
        setStats(response.data.data.stats);
      }
    } catch (error) {
      console.error('Error cargando proyectos eliminados:', error);
      toast.error('Error al cargar proyectos eliminados');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (project) => {
    try {
      const response = await api.post(`/projects/${project.id}/restore`);
      if (response.data.success) {
        toast.success(`Proyecto ${project.code} restaurado exitosamente`);
        setShowRestoreModal(false);
        setSelectedProject(null);
        await loadDeletedProjects();
      }
    } catch (error) {
      console.error('Error restaurando proyecto:', error);
      toast.error(error.response?.data?.message || 'Error al restaurar proyecto');
    }
  };

  const handlePermanentDelete = async () => {
    if (confirmText !== 'ELIMINAR_PERMANENTE') {
      toast.error('Debes escribir exactamente "ELIMINAR_PERMANENTE" para confirmar');
      return;
    }

    try {
      const response = await api.delete(`/projects/${selectedProject.id}/permanent`, {
        data: { confirm: 'ELIMINAR_PERMANENTE' }
      });
      
      if (response.data.success) {
        toast.success(`Proyecto ${selectedProject.code} eliminado permanentemente`);
        setShowPermanentDeleteModal(false);
        setSelectedProject(null);
        setConfirmText('');
        await loadDeletedProjects();
      }
    } catch (error) {
      console.error('Error eliminando proyecto permanentemente:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar proyecto');
    }
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <InlineSpinner size="large" text="Cargando proyectos eliminados..." />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">🗑️ Proyectos Eliminados</h2>
              <p className="text-red-200 text-sm">Gestión de proyectos eliminados lógicamente</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="bg-red-50 border-b border-red-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.total_deleted || 0}</div>
                <div className="text-sm text-gray-600">Total Eliminados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.deleted_last_7_days || 0}</div>
                <div className="text-sm text-gray-600">Últimos 7 días</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.deleted_last_30_days || 0}</div>
                <div className="text-sm text-gray-600">Últimos 30 días</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.deleted_by_users || 0}</div>
                <div className="text-sm text-gray-600">Administradores</div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
          {deletedProjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay proyectos eliminados</h3>
              <p className="text-gray-500">Todos los proyectos están activos en el sistema</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proyecto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario Original
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado al Eliminar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Eliminación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deletedProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{project.title}</div>
                          <div className="text-sm text-gray-500">{project.code}</div>
                          <div className="text-xs text-gray-400">{project.description?.substring(0, 100)}...</div>
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
                        <div className="text-xs text-gray-500 mt-1">
                          Etapa: {project.current_stage}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center">
                            <span className="text-red-600 mr-1">🗑️</span>
                            {project.deleted_by_name}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {dateUtils.formatDateTime(project.deleted_at)}
                        </div>
                        {project.deletion_reason && (
                          <div className="text-xs text-gray-600 mt-1 italic">
                            "{project.deletion_reason}"
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedProject(project);
                              setShowRestoreModal(true);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-xs transition-colors"
                          >
                            ↩️ Restaurar
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProject(project);
                              setShowPermanentDeleteModal(true);
                            }}
                            className="bg-red-800 hover:bg-red-900 text-white px-3 py-1 rounded-md text-xs transition-colors"
                          >
                            💥 Eliminar Permanente
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {deletedProjects.length} proyecto{deletedProjects.length !== 1 ? 's' : ''} eliminado{deletedProjects.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Restore Modal */}
      {showRestoreModal && selectedProject && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 rounded-full p-2 mr-3">
                <span className="text-green-600 text-xl">↩️</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Restaurar Proyecto</h3>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Proyecto:</strong> {selectedProject.code}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Título:</strong> {selectedProject.title}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Usuario:</strong> {selectedProject.user_name}
              </p>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              ¿Estás seguro de que quieres restaurar este proyecto? El proyecto volverá a estar disponible para el usuario.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRestoreModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRestore(selectedProject)}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
              >
                Restaurar Proyecto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Modal */}
      {showPermanentDeleteModal && selectedProject && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 rounded-full p-2 mr-3">
                <span className="text-red-600 text-xl">💥</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900">⚠️ Eliminar Permanentemente</h3>
            </div>
            
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium mb-2">
                ADVERTENCIA: Esta acción no se puede deshacer
              </p>
              <p className="text-sm text-red-700">
                <strong>Proyecto:</strong> {selectedProject.code} - {selectedProject.title}
              </p>
              <p className="text-sm text-red-700">
                <strong>Usuario:</strong> {selectedProject.user_name}
              </p>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Esto eliminará permanentemente el proyecto y todos sus documentos asociados. 
              Esta acción <strong>NO SE PUEDE DESHACER</strong>.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Para confirmar, escribe: <code className="bg-gray-100 px-1 rounded">ELIMINAR_PERMANENTE</code>
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                placeholder="ELIMINAR_PERMANENTE"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPermanentDeleteModal(false);
                  setConfirmText('');
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handlePermanentDelete}
                disabled={confirmText !== 'ELIMINAR_PERMANENTE'}
                className="flex-1 px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletedProjectsPanel;