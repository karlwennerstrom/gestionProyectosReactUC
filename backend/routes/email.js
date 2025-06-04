// backend/routes/email.js - ACTUALIZADA PARA SMTP SIN AUTENTICACIÓN
const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Test email endpoint - MEJORADO PARA SMTP SIN AUTENTICACIÓN
const testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    // Verificar configuración mínima requerida
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
      return res.status(500).json({
        success: false,
        message: 'Servidor de email no configurado. Se requiere SMTP_HOST y SMTP_PORT en el archivo .env',
        config_needed: {
          SMTP_HOST: 'Dirección del servidor SMTP',
          SMTP_PORT: 'Puerto del servidor SMTP (ej: 25, 587, 465)',
          SMTP_SECURE: 'true para puerto 465, false para otros (opcional)',
          SMTP_FROM: 'Dirección de email remitente (opcional)'
        }
      });
    }

    // Intentar importar el servicio de email
    try {
      const emailService = require('../services/emailService');
      
      console.log('🔧 Verificando configuración SMTP...');
      console.log(`   - Host: ${process.env.SMTP_HOST}`);
      console.log(`   - Port: ${process.env.SMTP_PORT}`);
      console.log(`   - Secure: ${process.env.SMTP_SECURE || 'false'}`);
      console.log(`   - From: ${process.env.SMTP_FROM || process.env.SMTP_USER || 'sistema@uc.cl'}`);
      console.log(`   - Auth: ${!!(process.env.SMTP_USER && process.env.SMTP_PASS) ? 'Sí' : 'No'}`);
      
      // Verificar conexión SMTP
      console.log('🔄 Verificando conexión SMTP...');
      const isConnected = await emailService.verifyConnection();
      
      if (!isConnected) {
        return res.status(500).json({
          success: false,
          message: 'Error conectando al servidor SMTP. Verifica la configuración.',
          debug_info: {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE || 'false',
            suggestion: 'Verifica que el servidor SMTP esté disponible y que el puerto sea correcto'
          }
        });
      }

      console.log('✅ Conexión SMTP verificada, enviando email de prueba...');

      // Enviar email de prueba
      const result = await emailService.sendTestEmail(email, req.user.full_name);

      if (result.success) {
        console.log('✅ Email de prueba enviado exitosamente');
        res.json({
          success: true,
          message: 'Email de prueba enviado exitosamente',
          data: { 
            messageId: result.messageId,
            from: process.env.SMTP_FROM || process.env.SMTP_USER || 'sistema@uc.cl',
            to: email,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        console.error('❌ Error enviando email:', result.error);
        res.status(500).json({
          success: false,
          message: 'Error enviando email de prueba',
          error: result.error,
          debug_info: {
            smtp_config: {
              host: process.env.SMTP_HOST,
              port: process.env.SMTP_PORT,
              secure: process.env.SMTP_SECURE || 'false'
            }
          }
        });
      }
    } catch (emailError) {
      console.error('❌ Error con el servicio de email:', emailError);
      res.status(500).json({
        success: false,
        message: 'Servicio de email no disponible.',
        error: process.env.NODE_ENV === 'development' ? emailError.message : 'Error interno',
        debug_info: process.env.NODE_ENV === 'development' ? {
          stack: emailError.stack,
          config: {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE
          }
        } : undefined
      });
    }

  } catch (error) {
    console.error('❌ Error en prueba de email:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Health check mejorado para el módulo de email
router.get('/health', (req, res) => {
  const hasRequiredConfig = !!(process.env.SMTP_HOST && process.env.SMTP_PORT);
  const hasAuthConfig = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  
  res.json({
    success: true,
    message: 'Módulo de email funcionando',
    timestamp: new Date().toISOString(),
    config_status: {
      smtp_host: !!process.env.SMTP_HOST,
      smtp_port: !!process.env.SMTP_PORT,
      smtp_from: !!process.env.SMTP_FROM,
      smtp_auth: hasAuthConfig,
      fully_configured: hasRequiredConfig,
      auth_mode: hasAuthConfig ? 'Con autenticación' : 'Sin autenticación'
    },
    current_config: {
      host: process.env.SMTP_HOST || 'No configurado',
      port: process.env.SMTP_PORT || 'No configurado',
      secure: process.env.SMTP_SECURE || 'false',
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'sistema@uc.cl',
      auth_enabled: hasAuthConfig
    },
    routes: {
      public: ['GET /api/email/health'],
      protected: ['POST /api/email/test']
    }
  });
});

// Test email endpoint
router.post('/test', authenticateToken, testEmail);

module.exports = router;