import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Configurar token en axios cuando cambie
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Verificar token al cargar la aplicación
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await api.get('/auth/verify');
          setUser(response.data.data.user);
        } catch (error) {
          console.error('Token inválido:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', {
        username,
        password
      });

      const { user: userData, token: newToken } = response.data.data;
      
      setUser(userData);
      setToken(newToken);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Error en login:', error);
      const message = error.response?.data?.message || 'Error al iniciar sesión';
      return { success: false, message };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      const updatedUser = response.data.data.user;
      setUser(updatedUser);
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      const message = error.response?.data?.message || 'Error al actualizar perfil';
      return { success: false, message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
      return { success: true };
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      const message = error.response?.data?.message || 'Error al cambiar contraseña';
      return { success: false, message };
    }
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isAuthenticated = () => {
    return !!user && !!token;
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateProfile,
    changePassword,
    isAdmin,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};