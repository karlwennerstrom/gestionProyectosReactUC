// frontend/src/components/Admin/ProjectsExecutiveChart.jsx
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ProjectsExecutiveChart = ({ projects = [] }) => {
  const [activeView, setActiveView] = useState('progress');

  // Datos para el gráfico de progreso
  const progressData = projects.map(project => ({
    name: project.code,
    title: project.title.length > 25 ? project.title.substring(0, 25) + '...' : project.title,
    progress: project.progress || 0,
    stages: `${project.stages_completed || 0}/${project.total_stages || 5}`,
    status: project.status,
    priority: project.priority || 'low',
    days: project.days_since_created || 0,
    user: project.user_name
  }));

  // Datos para gráfico de documentos
  const documentsData = projects.map(project => ({
    name: project.code,
    aprobados: project.documents_approved || 0,
    rechazados: project.documents_rejected || 0,
    pendientes: (project.documents_uploaded || 0) - (project.documents_approved || 0) - (project.documents_rejected || 0),
    total: project.documents_uploaded || 0
  }));

  // Datos para distribución por etapa
  const stageDistribution = [
    { name: 'Formalización', value: projects.filter(p => p.current_stage === 'formalization').length, color: '#ef4444' },
    { name: 'Diseño', value: projects.filter(p => p.current_stage === 'design').length, color: '#3b82f6' },
    { name: 'Entrega', value: projects.filter(p => p.current_stage === 'delivery').length, color: '#10b981' },
    { name: 'Operación', value: projects.filter(p => p.current_stage === 'operation').length, color: '#f59e0b' },
    { name: 'Mantenimiento', value: projects.filter(p => p.current_stage === 'maintenance').length, color: '#8b5cf6' }
  ];

  // Filtrar solo etapas con proyectos
  const validStageDistribution = stageDistribution.filter(stage => stage.value > 0);

  // Calcular métricas
  const avgProgress = projects.length > 0 ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length) : 0;
  const totalApproved = projects.reduce((acc, p) => acc + (p.documents_approved || 0), 0);
  const riskProjects = projects.filter(p => (p.days_since_created || 0) > 30 && (p.progress || 0) < 80).length;
  const avgDays = projects.length > 0 ? Math.round(projects.reduce((acc, p) => acc + (p.days_since_created || 0), 0) / projects.length) : 0;

  // Colores para prioridad
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  // Colores para estado
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'in-progress': return '#3b82f6';
      case 'pending': return '#f59e0b';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Custom tooltip para el gráfico de progreso
  const ProgressTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-xs">
          <p className="font-semibold text-gray-900">{data.title}</p>
          <p className="text-sm text-gray-600">Código: {data.name}</p>
          <p className="text-sm text-gray-600">Usuario: {data.user}</p>
          <p className="text-sm">
            <span className="font-medium">Progreso: </span>
            <span className="text-blue-600">{data.progress}%</span>
          </p>
          <p className="text-sm">
            <span className="font-medium">Etapas: </span>
            <span className="text-green-600">{data.stages}</span>
          </p>
          <p className="text-sm">
            <span className="font-medium">Días activo: </span>
            <span className="text-orange-600">{data.days}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip para documentos
  const DocumentsTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-sm text-green-600">✅ Aprobados: {data.aprobados}</p>
          <p className="text-sm text-red-600">❌ Rechazados: {data.rechazados}</p>
          <p className="text-sm text-yellow-600">⏳ Pendientes: {data.pendientes}</p>
          <p className="text-sm text-gray-600">📄 Total: {data.total}</p>
        </div>
      );
    }
    return null;
  };

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">📊 Vista Ejecutiva de Proyectos</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-gray-500">No hay proyectos para mostrar en el gráfico</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      {/* Header con pestañas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-lg font-medium text-gray-900">📊 Vista Ejecutiva de Proyectos</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('progress')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeView === 'progress'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📈 Progreso
          </button>
          <button
            onClick={() => setActiveView('documents')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeView === 'documents'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📄 Documentos
          </button>
          <button
            onClick={() => setActiveView('distribution')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeView === 'distribution'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🎯 Distribución
          </button>
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">Progreso Promedio</div>
          <div className="text-2xl font-bold text-blue-800">{avgProgress}%</div>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
          <div className="text-sm text-green-600 font-medium">Docs. Aprobados</div>
          <div className="text-2xl font-bold text-green-800">{totalApproved}</div>
        </div>
        <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg">
          <div className="text-sm text-red-600 font-medium">Proyectos en Riesgo</div>
          <div className="text-2xl font-bold text-red-800">{riskProjects}</div>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
          <div className="text-sm text-purple-600 font-medium">Tiempo Promedio</div>
          <div className="text-2xl font-bold text-purple-800">{avgDays} días</div>
        </div>
      </div>

      {/* Gráficos principales */}
      <div className="h-96">
        {activeView === 'progress' && (
          <div>
            <h4 className="text-md font-medium text-gray-800 mb-4">📈 Progreso por Proyecto</h4>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={progressData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={11}
                />
                <YAxis 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<ProgressTooltip />} />
                <Bar 
                  dataKey="progress" 
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeView === 'documents' && (
          <div>
            <h4 className="text-md font-medium text-gray-800 mb-4">📄 Estado de Documentos por Proyecto</h4>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={documentsData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={11}
                />
                <YAxis />
                <Tooltip content={<DocumentsTooltip />} />
                <Legend />
                <Bar dataKey="aprobados" stackId="a" fill="#10b981" name="✅ Aprobados" />
                <Bar dataKey="pendientes" stackId="a" fill="#f59e0b" name="⏳ Pendientes" />
                <Bar dataKey="rechazados" stackId="a" fill="#ef4444" name="❌ Rechazados" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeView === 'distribution' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-80">
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-4">🎯 Distribución por Etapa</h4>
              {validStageDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={stageDistribution.filter(stage => stage.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      innerRadius={30}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {validStageDistribution.filter(stage => stage.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📊</div>
                    <p className="text-gray-500">Sin datos para mostrar</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-md font-medium text-gray-800 mb-4">⚡ Resumen por Proyecto</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getPriorityColor(project.priority) }}
                      ></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {project.code}
                        </div>
                        <div className="text-xs text-gray-500">
                          {project.user_name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {project.progress || 0}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {project.stages_completed || 0}/{project.total_stages || 5} etapas
                        </div>
                      </div>
                      <div 
                        className="w-2 h-8 rounded-full"
                        style={{ backgroundColor: getStatusColor(project.status) }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leyenda de colores */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Alta Prioridad</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Media Prioridad</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Baja Prioridad / Aprobado</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>En Proceso</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsExecutiveChart;