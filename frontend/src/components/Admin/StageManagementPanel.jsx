// frontend/src/components/Admin/StageManagementPanel.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { InlineSpinner } from '../Common/LoadingSpinner';
import toast from 'react-hot-toast';

const StageManagementPanel = ({ onClose }) => {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);

  const [newStage, setNewStage] = useState({
    stage_id: '',
    name: '',
    description: '',
    icon: '📋',
    color: 'blue',
    requirements: []
  });

  const colorOptions = [
    { value: 'red', label: 'Rojo', class: 'bg-red-500' },
    { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
    { value: 'green', label: 'Verde', class: 'bg-green-500' },
    { value: 'orange', label: 'Naranja', class: 'bg-orange-500' },
    { value: 'purple', label: 'Morado', class: 'bg-purple-500' },
    { value: 'yellow', label: 'Amarillo', class: 'bg-yellow-500' },
    { value: 'pink', label: 'Rosa', class: 'bg-pink-500' },
    { value: 'gray', label: 'Gris', class: 'bg-gray-500' }
  ];

  useEffect(() => {
    loadStages();
  }, []);

  const loadStages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/stage-management/stages');
      if (response.data.success) {
        setStages(response.data.data.stages);
      }
    } catch (error) {
      console.error('Error cargando etapas:', error);
      toast.error('Error al cargar etapas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStage = async (e) => {
    e.preventDefault();
    
    if (!newStage.stage_id || !newStage.name || !newStage.description) {
      toast.error('Todos los campos son requeridos');
      return;
    }

    try {
      const response = await api.post('/stage-management/stages', newStage);
      if (response.data.success) {
        toast.success('Etapa creada exitosamente');
        setShowCreateModal(false);
        setNewStage({
          stage_id: '',
          name: '',
          description: '',
          icon: '📋',
          color: 'blue',
          requirements: []
        });
        await loadStages();
      }
    } catch (error) {
      console.error('Error creando etapa:', error);
      toast.error(error.response?.data?.message || 'Error al crear etapa');
    }
  };

  const handleDeleteStage = async (stageId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta etapa? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await api.delete(`/stage-management/stages/${stageId}`);
      if (response.data.success) {
        toast.success('Etapa eliminada exitosamente');
        await loadStages();
      }
    } catch (error) {
      console.error('Error eliminando etapa:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar etapa');
    }
  };

  const handleEditStage = (stage) => {
    setSelectedStage(stage);
    setNewStage({
      stage_id: stage.id,
      name: stage.name,
      description: stage.description,
      icon: stage.icon,
      color: stage.color,
      requirements: stage.requirements || []
    });
    setShowEditModal(true);
  };

  const handleUpdateStage = async (e) => {
    e.preventDefault();

    try {
      const response = await api.put(`/stage-management/stages/${selectedStage.id}`, {
        name: newStage.name,
        description: newStage.description,
        icon: newStage.icon,
        color: newStage.color,
        requirements: newStage.requirements
      });

      if (response.data.success) {
        toast.success('Etapa actualizada exitosamente');
        setShowEditModal(false);
        setSelectedStage(null);
        await loadStages();
      }
    } catch (error) {
      console.error('Error actualizando etapa:', error);
      toast.error(error.response?.data?.message || 'Error al actualizar etapa');
    }
  };

  const handleManageRequirements = (stage) => {
    setSelectedStage(stage);
    setShowRequirementsModal(true);
  };

  const addRequirement = () => {
    setNewStage(prev => ({
      ...prev,
      requirements: [...prev.requirements, {
        id: `req_${Date.now()}`,
        name: '',
        description: '',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '5MB'
      }]
    }));
  };

  const updateRequirement = (index, field, value) => {
    setNewStage(prev => ({
      ...prev,
      requirements: prev.requirements.map((req, i) => 
        i === index ? { ...req, [field]: value } : req
      )
    }));
  };

  const removeRequirement = (index) => {
    setNewStage(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <InlineSpinner size="large" text="Cargando gestión de etapas..." />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">⚙️ Gestión de Etapas y Requerimientos</h2>
              <p className="text-purple-200 text-sm">Configurar etapas personalizadas del sistema</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Actions */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Etapas Configuradas ({stages.length})
            </h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              ➕ Nueva Etapa
            </button>
          </div>

          {/* Stages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stages.map((stage) => (
              <div key={stage.id} className={`border-2 rounded-lg p-4 ${
                stage.is_default ? 'border-gray-300 bg-gray-50' : 'border-purple-300 bg-purple-50'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{stage.icon}</span>
                    <h4 className="font-medium text-gray-900">{stage.name}</h4>
                  </div>
                  {stage.is_default ? (
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                      Por defecto
                    </span>
                  ) : (
                    <span className="text-xs bg-purple-200 text-purple-700 px-2 py-1 rounded-full">
                      Personalizada
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4">{stage.description}</p>

                <div className="text-xs text-gray-500 mb-4">
                  <p><strong>ID:</strong> {stage.id}</p>
                  <p><strong>Requerimientos:</strong> {stage.requirements?.length || 0}</p>
                  <p><strong>Color:</strong> 
                    <span className={`inline-block w-3 h-3 rounded-full ml-1 ${
                      colorOptions.find(c => c.value === stage.color)?.class || 'bg-gray-400'
                    }`}></span>
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleManageRequirements(stage)}
                    className="flex-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
                  >
                    📋 Requerimientos
                  </button>
                  
                  {!stage.is_default && (
                    <>
                      <button
                        onClick={() => handleEditStage(stage)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteStage(stage.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md transition-colors"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {stages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay etapas configuradas</h3>
              <p className="text-gray-500 mb-4">Crea tu primera etapa personalizada</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
              >
                ➕ Crear Primera Etapa
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Create Stage Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="bg-purple-600 text-white p-4 rounded-t-lg">
              <h3 className="text-lg font-medium">➕ Crear Nueva Etapa</h3>
            </div>
            
            <form onSubmit={handleCreateStage} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID de Etapa (único)
                  </label>
                  <input
                    type="text"
                    value={newStage.stage_id}
                    onChange={(e) => setNewStage({...newStage, stage_id: e.target.value.toLowerCase().replace(/[^a-z_]/g, '')})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="ej: quality_control"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={newStage.name}
                    onChange={(e) => setNewStage({...newStage, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Control de Calidad"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={newStage.description}
                  onChange={(e) => setNewStage({...newStage, description: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Descripción de la etapa..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icono (emoji)
                  </label>
                  <input
                    type="text"
                    value={newStage.icon}
                    onChange={(e) => setNewStage({...newStage, icon: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="📋"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <select
                    value={newStage.color}
                    onChange={(e) => setNewStage({...newStage, color: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  >
                    {colorOptions.map(color => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Requirements Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Requerimientos ({newStage.requirements.length})
                  </label>
                  <button
                    type="button"
                    onClick={addRequirement}
                    className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-md"
                  >
                    ➕ Agregar
                  </button>
                </div>

                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {newStage.requirements.map((req, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input
                          type="text"
                          value={req.name}
                          onChange={(e) => updateRequirement(index, 'name', e.target.value)}
                          placeholder="Nombre del requerimiento"
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <div className="flex gap-2">
                          <select
                            value={req.required}
                            onChange={(e) => updateRequirement(index, 'required', e.target.value === 'true')}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="true">Obligatorio</option>
                            <option value="false">Opcional</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => removeRequirement(index)}
                            className="text-red-600 hover:text-red-800 px-2"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={req.description}
                        onChange={(e) => updateRequirement(index, 'description', e.target.value)}
                        placeholder="Descripción..."
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md"
                >
                  Crear Etapa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Stage Modal - Similar structure to Create Modal */}
      {showEditModal && selectedStage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="bg-green-600 text-white p-4 rounded-t-lg">
              <h3 className="text-lg font-medium">✏️ Editar Etapa: {selectedStage.name}</h3>
            </div>
            
            <form onSubmit={handleUpdateStage} className="p-6 space-y-4">
              {/* Similar form structure as create modal but for editing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID de Etapa (no editable)
                  </label>
                  <input
                    type="text"
                    value={selectedStage.id}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={newStage.name}
                    onChange={(e) => setNewStage({...newStage, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={newStage.description}
                  onChange={(e) => setNewStage({...newStage, description: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                >
                  Actualizar Etapa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Requirements Management Modal */}
      {showRequirementsModal && selectedStage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="bg-blue-600 text-white p-4 rounded-t-lg">
              <h3 className="text-lg font-medium">📋 Requerimientos: {selectedStage.name}</h3>
              <p className="text-blue-200 text-sm">Gestionar documentos requeridos para esta etapa</p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {selectedStage.requirements?.map((req, index) => (
                  <div key={req.id || index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{req.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{req.description}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {req.required ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                            Obligatorio
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            Opcional
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 grid grid-cols-2 gap-4">
                      <div>
                        <strong>Formatos:</strong> {req.acceptedTypes?.join(', ') || 'Todos'}
                      </div>
                      <div>
                        <strong>Tamaño máx:</strong> {req.maxSize || '5MB'}
                      </div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">
                    <p>No hay requerimientos configurados para esta etapa</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button
                  onClick={() => setShowRequirementsModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StageManagementPanel;