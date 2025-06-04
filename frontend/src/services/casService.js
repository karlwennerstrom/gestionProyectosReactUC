// frontend/src/services/casService.js - Servicio CAS para Frontend
import { api } from './api';

class CASService {
  constructor() {
    this.enabled = process.env.REACT_APP_CAS_ENABLED === 'true';
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  }

  // Verificar si CAS está habilitado
  isEnabled() {
    return this.enabled;
  }

  // Obtener URL de login CAS
  async getLoginUrl(returnUrl = '/dashboard') {
    try {
      const response = await api.get('/cas/login-url', {
        params: { returnUrl }
      });
      
      if (response.data.success) {
        return response.data.data.login_url;
      } else {
        throw new Error(response.data.message || 'Error obteniendo URL de CAS');
      }
    } catch (error) {
      console.error('Error obteniendo URL de login CAS:', error);
      throw error;
    }
  }

  // Iniciar login CAS
  async startLogin(returnUrl = '/dashboard') {
    try {
      const loginUrl = await this.getLoginUrl(returnUrl);
      window.location.href = loginUrl;
    } catch (error) {
      console.error('Error iniciando login CAS:', error);
      throw error;
    }
  }

  // Logout CAS
  logout() {
    window.location.href = `${this.baseUrl}/cas/logout`;
  }

  // Verificar estado de CAS
  async getStatus() {
    try {
      const response = await api.get('/cas/status');
      return response.data.data;
    } catch (error) {
      console.error('Error verificando estado CAS:', error);
      return {
        cas_enabled: false,
        error: error.message
      };
    }
  }

  // Procesar token de callback CAS
  processCallbackToken(token) {
    if (token) {
      localStorage.setItem('token', token);
      // Configurar el token en axios para requests futuros
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return true;
    }
    return false;
  }

  // Manejar parámetros de URL después del callback CAS
  handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const casLogin = urlParams.get('cas_login');
    const newUser = urlParams.get('new_user');
    const error = urlParams.get('error');
    const errorMessage = urlParams.get('message');

    // Limpiar parámetros de la URL
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);

    return {
      token,
      casLogin: casLogin === 'true',
      newUser: newUser === 'true',
      error,
      errorMessage: errorMessage ? decodeURIComponent(errorMessage) : null
    };
  }
}

// Exportar instancia singleton
export const casService = new CASService();
export default casService;