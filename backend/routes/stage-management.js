// backend/routes/stage-management.js - RUTAS SEPARADAS
const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { stageRequirements } = require('../config/stageRequirements');

const router = express.Router();

// Health check del módulo
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Módulo de gestión de etapas funcionando correctamente',
    timestamp: new Date().toISOString(),
    default_stages: Object.keys(stageRequirements).length,
    routes: [
      'GET /api/stage-management/health',
      'GET /api/stage-management/stages',
      'GET /api/stage-management/active-config'
    ]
  });
});

// Obtener todas las etapas configuradas
router.get('/stages', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Por ahora retornar las etapas por defecto
    const stages = Object.keys(stageRequirements).map(stageId => ({
      id: stageId,
      ...stageRequirements[stageId],
      is_default: true,
      can_modify: false
    }));

    res.json({
      success: true,
      data: {
        stages,
        total: stages.length
      }
    });
  } catch (error) {
    console.error('Error obteniendo etapas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener configuración activa
router.get('/active-config', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        stages: stageRequirements,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;