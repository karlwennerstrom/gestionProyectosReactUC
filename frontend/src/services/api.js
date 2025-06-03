import axios from 'axios';

// Configuración base de la API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    // Agregar token si existe
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log para desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }
    
    return config;
  },
  (error) => {
    console.error('Error en request:', error);
    return Promise.reject(error);
  }
);
export const aiService = {
  chat: (message) => 
    api.post('/ai/chat', { message }),
  
  chatProject: (projectId, question) => 
    api.post(`/ai/chat/project/${projectId}`, { question }),
  
  getKnowledgeInfo: () => 
    api.get('/ai/knowledge'),
  
  searchKnowledge: (query) => 
    api.post('/ai/knowledge/search', { query }),
  
  getAIHealth: () => 
    api.get('/ai/health'),
  
  getCacheStats: () => 
    api.get('/ai/cache/stats'),
  
  clearCache: () => 
    api.post('/ai/cache/clear')
};
// Interceptor para responses
api.interceptors.response.use(
  (response) => {
    // Log para desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    
    return response;
  },
  (error) => {
    // Log para desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.response?.data);
    }
    
    // Manejar errores específicos
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Servicios de autenticación
export const authService = {
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
  
  register: (userData) => 
    api.post('/auth/register', userData),
  
  getProfile: () => 
    api.get('/auth/profile'),
  
  updateProfile: (profileData) => 
    api.put('/auth/profile', profileData),
  
  changePassword: (currentPassword, newPassword) => 
    api.put('/auth/change-password', { currentPassword, newPassword }),
  
  verifyToken: () => 
    api.get('/auth/verify'),
  
  logout: () => 
    api.post('/auth/logout')
};

// Servicios de proyectos
export const projectService = {
  getAll: (params = {}) => 
    api.get('/projects', { params }),
  
  getMy: (params = {}) => 
    api.get('/projects/my', { params }),
  
  getById: (id) => 
    api.get(`/projects/${id}`),
  
  create: (projectData) => 
    api.post('/projects', projectData),
  
  updateStatus: (id, status, admin_comments) => 
    api.put(`/projects/${id}/status`, { status, admin_comments }),
  
  updateStage: (id, stage_name, status, admin_comments) => 
    api.put(`/projects/${id}/stage`, { stage_name, status, admin_comments }),
  
  moveToNextStage: (id, admin_comments) => 
    api.post(`/projects/${id}/next-stage`, { admin_comments }),
  
  delete: (id) => 
    api.delete(`/projects/${id}`),
  
  getStats: () => 
    api.get('/projects/stats')
};

// Servicios de documentos
export const documentService = {
  upload: (formData) => 
    api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  getByProject: (projectId, stageName = null) => {
    const params = stageName ? { stage_name: stageName } : {};
    return api.get(`/documents/project/${projectId}`, { params });
  },
  
  getMy: () => 
    api.get('/documents/my'),
  
  getById: (id) => 
    api.get(`/documents/${id}`),
  
  download: (id) => 
    api.get(`/documents/${id}/download`, {
      responseType: 'blob', // Para archivos
    }),
  
  delete: (id) => 
    api.delete(`/documents/${id}`),
  
  search: (query) => 
    api.get('/documents/search', { params: { q: query } }),
  
  getStats: () => 
    api.get('/documents/stats')
};

// Utilidades para manejo de archivos
export const fileUtils = {
  downloadFile: async (documentId, fileName) => {
    try {
      const response = await documentService.download(documentId);
      
      // Crear URL temporal para el archivo
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Error descargando archivo:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Error al descargar archivo' 
      };
    }
  },
  
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  getFileTypeIcon: (mimeType) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📈';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('text')) return '📋';
    return '📎';
  }
};

// Utilidades para fechas
export const dateUtils = {
  formatDate: (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },
  
  formatDateTime: (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  timeAgo: (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (days < 30) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    
    return dateUtils.formatDate(dateString);
  }
};

export default api;