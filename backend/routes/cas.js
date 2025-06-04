// backend/routes/cas.js - CORREGIDO para manejar callback apropiadamente
const express = require('express');
const jwt = require('jsonwebtoken');
const casService = require('../services/casService');
const User = require('../models/User');

const router = express.Router();

// Generar JWT token (función compartida)
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Health check para CAS
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Módulo CAS funcionando',
    cas_enabled: casService.isEnabled(),
    cas_base_url: process.env.CAS_BASE_URL,
    timestamp: new Date().toISOString(),
    routes: {
      public: [
        'GET /api/cas/health',
        'GET /api/cas/login',
        'GET /api/cas/callback',
        'GET /api/cas/logout'
      ]
    }
  });
});

// Ruta para iniciar login CAS
router.get('/login', (req, res) => {
  try {
    if (!casService.isEnabled()) {
      return res.status(503).json({
        success: false,
        message: 'Autenticación CAS no está habilitada'
      });
    }

    const returnUrl = req.query.returnUrl || '/dashboard';
    const casLoginUrl = casService.getLoginUrl(returnUrl);
    
    console.log('🔗 Redirigiendo a CAS:', casLoginUrl);
    
    // Redirigir al usuario a CAS
    res.redirect(casLoginUrl);
  } catch (error) {
    console.error('Error iniciando login CAS:', error);
    res.status(500).json({
      success: false,
      message: 'Error iniciando autenticación CAS'
    });
  }
});

// ← CALLBACK CORREGIDO - AHORA RETORNA JSON EN LUGAR DE REDIRECCIONAR
router.get('/callback', async (req, res) => {
  try {
    const { ticket, returnUrl = '/dashboard' } = req.query;
    
    if (!ticket) {
      console.error('❌ No se recibió ticket de CAS');
      return res.status(400).json({
        success: false,
        message: 'No se recibió ticket de CAS',
        error: 'no_ticket'
      });
    }

    console.log('🎫 Procesando callback CAS con ticket:', ticket.substring(0, 20) + '...');

    // Construir service URL que coincida con lo que espera el frontend
    const serviceUrl = `${process.env.FRONTEND_URL}/auth/cas/callback?returnUrl=${encodeURIComponent(returnUrl)}`;
    
    console.log('🔄 Service URL para validación:', serviceUrl);
    
    // Validar ticket con CAS
    const validation = await casService.validateTicket(ticket, serviceUrl);
    
    if (!validation.success) {
      console.error('❌ Validación CAS falló:', validation.error);
      return res.status(401).json({
        success: false,
        message: 'Validación CAS falló',
        error: 'cas_validation_failed',
        details: validation.error
      });
    }

    console.log('✅ Ticket CAS válido para usuario:', validation.username);

    // Buscar o crear usuario
    const userResult = await casService.findOrCreateUser(validation);
    
    if (!userResult.success) {
      console.error('❌ Error procesando usuario CAS:', userResult.error);
      return res.status(403).json({
        success: false,
        message: 'Usuario no autorizado',
        error: 'user_not_authorized',
        details: userResult.error,
        email: userResult.email
      });
    }

    const { user, isNewUser } = userResult;
    
    // Generar JWT token
    const token = generateToken(user);
    
    console.log(`✅ Login CAS exitoso para ${user.email} (${user.role})${isNewUser ? ' - USUARIO NUEVO' : ''}`);
    
    // ← RETORNAR JSON CON TOKEN EN LUGAR DE REDIRECCIONAR
    res.json({
      success: true,
      message: 'Autenticación CAS exitosa',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      },
      isNewUser: isNewUser,
      returnUrl: returnUrl
    });
    
  } catch (error) {
    console.error('❌ Error en callback CAS:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno procesando callback CAS',
      error: 'cas_callback_error',
      details: error.message
    });
  }
});

// Logout CAS
router.get('/logout', (req, res) => {
  try {
    if (!casService.isEnabled()) {
      return res.redirect(`${process.env.FRONTEND_URL}/login`);
    }

    const casLogoutUrl = casService.getLogoutUrl();
    console.log('👋 Logout CAS, redirigiendo a:', casLogoutUrl);
    
    res.redirect(casLogoutUrl);
  } catch (error) {
    console.error('Error en logout CAS:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login`);
  }
});

// Ruta para obtener URL de login CAS (para frontend)
router.get('/login-url', (req, res) => {
  try {
    if (!casService.isEnabled()) {
      return res.status(503).json({
        success: false,
        message: 'CAS no está habilitado'
      });
    }

    const returnUrl = req.query.returnUrl || '/dashboard';
    const loginUrl = casService.getLoginUrl(returnUrl);
    
    res.json({
      success: true,
      data: {
        login_url: loginUrl,
        cas_enabled: true
      }
    });
  } catch (error) {
    console.error('Error obteniendo URL de login CAS:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando URL de login CAS'
    });
  }
});

// Ruta para verificar estado de CAS
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      cas_enabled: casService.isEnabled(),
      cas_base_url: process.env.CAS_BASE_URL || 'No configurado',
      auto_create_users: process.env.CAS_AUTO_CREATE_USERS === 'true',
      frontend_url: process.env.FRONTEND_URL || 'No configurado'
    }
  });
});

module.exports = router;