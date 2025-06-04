// backend/routes/cas.js - MEJORADA para mejor redirección
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
    backend_url: process.env.BACKEND_URL || 'http://localhost:5000',
    frontend_url: process.env.FRONTEND_URL || 'http://localhost:3000',
    timestamp: new Date().toISOString()
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
    
    console.log('🔗 Iniciando login CAS:');
    console.log(`   - Return URL solicitada: ${returnUrl}`);
    console.log(`   - Redirigiendo a CAS: ${casLoginUrl}`);
    
    res.redirect(casLoginUrl);
  } catch (error) {
    console.error('❌ Error iniciando login CAS:', error);
    res.status(500).json({
      success: false,
      message: 'Error iniciando autenticación CAS'
    });
  }
});

// ✅ CALLBACK MEJORADO - Mejor manejo de redirección según rol
router.get('/callback', async (req, res) => {
  try {
    const { ticket, returnUrl = '/dashboard' } = req.query;
    
    if (!ticket) {
      console.error('❌ No se recibió ticket de CAS');
      const errorUrl = `${process.env.FRONTEND_URL}/login?error=no_ticket&message=${encodeURIComponent('No se recibió ticket de CAS')}`;
      return res.redirect(errorUrl);
    }

    console.log('🎫 Procesando callback CAS:');
    console.log(`   - Ticket: ${ticket.substring(0, 20)}...`);
    console.log(`   - Return URL: ${returnUrl}`);

    // Validar ticket con CAS
    const serviceUrl = casService.getServiceUrl(returnUrl);
    console.log(`   - Service URL: ${serviceUrl}`);
    
    const validation = await casService.validateTicket(ticket, serviceUrl);
    
    if (!validation.success) {
      console.error('❌ Validación CAS falló:', validation.error);
      const errorUrl = `${process.env.FRONTEND_URL}/login?error=cas_validation_failed&message=${encodeURIComponent(validation.error)}`;
      return res.redirect(errorUrl);
    }

    console.log('✅ Ticket CAS válido para usuario:', validation.username);

    // Buscar o crear usuario
    const userResult = await casService.findOrCreateUser(validation);
    
    if (!userResult.success) {
      console.error('❌ Error procesando usuario CAS:', userResult.error);
      const errorUrl = `${process.env.FRONTEND_URL}/login?error=user_not_authorized&message=${encodeURIComponent(userResult.error)}`;
      return res.redirect(errorUrl);
    }

    const { user, isNewUser } = userResult;
    
    // Generar JWT token
    const token = generateToken(user);
    
    console.log(`✅ Login CAS exitoso:`, {
      email: user.email,
      role: user.role,
      isNewUser: isNewUser
    });
    
    // ✅ LÓGICA MEJORADA DE REDIRECCIÓN
    let finalRedirectUrl;
    
    // 1. Si es admin, siempre ir a /admin
    if (user.role === 'admin') {
      finalRedirectUrl = '/admin';
      console.log('👨‍💼 Usuario admin - redirigiendo a /admin');
    }
    // 2. Si es user, ir a dashboard
    else if (user.role === 'user') {
      finalRedirectUrl = '/dashboard';
      console.log('👤 Usuario normal - redirigiendo a /dashboard');
    }
    // 3. Fallback al returnUrl original
    else {
      finalRedirectUrl = returnUrl;
      console.log(`🔄 Usando returnUrl original: ${returnUrl}`);
    }
    
    // Construir URL final con parámetros CAS
    const params = new URLSearchParams({
      cas_login: 'true',
      token: token,
      new_user: isNewUser.toString()
    });
    
    const successUrl = `${process.env.FRONTEND_URL}${finalRedirectUrl}?${params.toString()}`;
    
    console.log('🎯 Redirigiendo a frontend:', successUrl);
    res.redirect(successUrl);
    
  } catch (error) {
    console.error('❌ Error en callback CAS:', error);
    const errorUrl = `${process.env.FRONTEND_URL}/login?error=cas_callback_error&message=${encodeURIComponent(error.message)}`;
    res.redirect(errorUrl);
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
    console.error('❌ Error en logout CAS:', error);
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
        cas_enabled: true,
        service_url: casService.getServiceUrl(returnUrl)
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo URL de login CAS:', error);
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
      backend_url: process.env.BACKEND_URL || 'http://localhost:5000',
      frontend_url: process.env.FRONTEND_URL || 'http://localhost:3000',
      auto_create_users: process.env.CAS_AUTO_CREATE_USERS === 'true'
    }
  });
});

module.exports = router;