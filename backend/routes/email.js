// backend/routes/email.js - CORREGIDO
const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Test email endpoint - USANDO PROJECTCONTROLLER EXISTENTE
const testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    // Verificar si el servicio de email está configurado
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(500).json({
        success: false,
        message: 'Servidor de email no configurado. Verifica las variables SMTP_USER y SMTP_PASS en el archivo .env'
      });
    }

    // Intentar importar el servicio de email
    try {
      const emailService = require('../services/emailService');
      
      // Verificar conexión SMTP
      const isConnected = await emailService.verifyConnection();
      if (!isConnected) {
        return res.status(500).json({
          success: false,
          message: 'Error conectando al servidor SMTP. Verifica la configuración.'
        });
      }

      // Enviar email de prueba
      const result = await emailService.sendTestEmail(email, req.user.full_name);

      if (result.success) {
        res.json({
          success: true,
          message: 'Email de prueba enviado exitosamente',
          data: { messageId: result.messageId }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error enviando email de prueba',
          error: result.error
        });
      }
    } catch (emailError) {
      console.error('Error con el servicio de email:', emailError);
      res.status(500).json({
        success: false,
        message: 'Servicio de email no disponible. Verifica que el archivo emailService.js existe y está configurado correctamente.',
        error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
      });
    }

  } catch (error) {
    console.error('Error en prueba de email:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Health check para el módulo de email
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Módulo de email funcionando',
    timestamp: new Date().toISOString(),
    smtp_configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
    routes: {
      public: ['GET /api/email/health'],
      protected: ['POST /api/email/test']
    }
  });
});

// Test email endpoint
router.post('/test', authenticateToken, testEmail);

module.exports = router;