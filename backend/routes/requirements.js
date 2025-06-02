// backend/routes/requirements.js
const express = require('express');
const { param, body, validationResult } = require('express-validator');
const RequirementController = require('../controllers/requirementController');
const { authenticateToken, requireAdmin, logAuthenticatedRequest } = require('../middleware/auth');

const router = express.Router();

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array()
    });
  }
  next();
};

// RUTAS PÚBLICAS DE INFORMACIÓN
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Módulo de requerimientos funcionando correctamente',
    timestamp: new Date().toISOString(),
    routes: {
      user: [
        'GET /api/requirements/project/:project_id',
        'GET /api/requirements/:project_id/:stage_name/:requirement_id/documents'
      ],
      admin: [
        'PUT /api/requirements/:project_id/:stage_name/:requirement_id/status',
        'PUT /api/requirements/:project_id/:stage_name/approve-all',
        'GET /api/requirements/:project_id/stats',
        'POST /api/requirements/:project_id/generate-report'
      ]
    }
  });
});

// RUTAS PROTEGIDAS - Requieren autenticación

// GET /api/requirements/project/:project_id - Obtener requerimientos de un proyecto
router.get('/project/:project_id', 
  authenticateToken,
  param('project_id').isInt().withMessage('ID de proyecto debe ser un número'),
  handleValidationErrors,
  logAuthenticatedRequest,
  RequirementController.getProjectRequirements
);

// PUT /api/requirements/:project_id/:stage_name/:requirement_id/status - Actualizar estado de requerimiento (solo admin)
router.put('/:project_id/:stage_name/:requirement_id/status', 
  authenticateToken,
  requireAdmin,
  param('project_id').isInt().withMessage('ID de proyecto debe ser un número'),
  param('stage_name').isIn(['formalization', 'design', 'delivery', 'operation', 'maintenance']).withMessage('Etapa inválida'),
  param('requirement_id').notEmpty().withMessage('ID de requerimiento requerido'),
  body('status').isIn(['pending', 'in-review', 'approved', 'rejected']).withMessage('Estado inválido'),
  body('admin_comments').optional().isLength({ max: 1000 }).withMessage('Comentarios demasiado largos'),
  handleValidationErrors,
  logAuthenticatedRequest,
  RequirementController.updateRequirementStatus
);

// PUT /api/requirements/:project_id/:stage_name/approve-all - Aprobar todos los requerimientos de una etapa (solo admin)
router.put('/:project_id/:stage_name/approve-all', 
  authenticateToken,
  requireAdmin,
  param('project_id').isInt().withMessage('ID de proyecto debe ser un número'),
  param('stage_name').isIn(['formalization', 'design', 'delivery', 'operation', 'maintenance']).withMessage('Etapa inválida'),
  body('admin_comments').optional().isLength({ max: 500 }).withMessage('Comentarios demasiado largos'),
  handleValidationErrors,
  logAuthenticatedRequest,
  RequirementController.approveStageRequirements
);

// GET /api/requirements/:project_id/:stage_name/:requirement_id/documents - Obtener historial de documentos
router.get('/:project_id/:stage_name/:requirement_id/documents', 
  authenticateToken,
  param('project_id').isInt().withMessage('ID de proyecto debe ser un número'),
  param('stage_name').isIn(['formalization', 'design', 'delivery', 'operation', 'maintenance']).withMessage('Etapa inválida'),
  param('requirement_id').notEmpty().withMessage('ID de requerimiento requerido'),
  handleValidationErrors,
  logAuthenticatedRequest,
  RequirementController.getRequirementDocumentHistory
);

// GET /api/requirements/:project_id/stats - Obtener estadísticas de requerimientos
router.get('/:project_id/stats', 
  authenticateToken,
  param('project_id').isInt().withMessage('ID de proyecto debe ser un número'),
  handleValidationErrors,
  logAuthenticatedRequest,
  RequirementController.getRequirementStats
);

// POST /api/requirements/:project_id/generate-report - Generar informe final (solo admin)
router.post('/:project_id/generate-report', 
  authenticateToken,
  requireAdmin,
  param('project_id').isInt().withMessage('ID de proyecto debe ser un número'),
  handleValidationErrors,
  logAuthenticatedRequest,
  RequirementController.generateFinalReport
);

module.exports = router;