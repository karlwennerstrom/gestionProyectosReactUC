// backend/routes/stage-management.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const StageManagementController = require('../controllers/stageManagementController');
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

// ← VALIDACIONES
const createStageValidation = [
  body('stage_id')
    .trim()
    .notEmpty()
    .withMessage('stage_id es requerido')
    .matches(/^[a-z_]+$/)
    .withMessage('stage_id solo puede contener letras minúsculas y guiones bajos'),
  
  body('name')
    .trim()
    .notEmpty()
    .withMessage('name es requerido')
    .isLength({ min: 3, max: 100 })
    .withMessage('name debe tener entre 3 y 100 caracteres'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('description es requerido')
    .isLength({ min: 10, max: 500 })
    .withMessage('description debe tener entre 10 y 500 caracteres'),
  
  body('icon')
    .optional()
    .isLength({ max: 10 })
    .withMessage('icon debe tener máximo 10 caracteres'),
  
  body('color')
    .optional()
    .isIn(['red', 'blue', 'green', 'orange', 'purple', 'yellow', 'pink', 'gray'])
    .withMessage('color debe ser uno de los colores válidos'),
  
  body('requirements')
    .optional()
    .isArray()
    .withMessage('requirements debe ser un array'),
  
  body('stage_order')
    .optional()
    .isInt({ min: 1, max: 999 })
    .withMessage('stage_order debe ser un número entre 1 y 999')
];

const requirementValidation = [
  body('requirement_id')
    .trim()
    .notEmpty()
    .withMessage('requirement_id es requerido')
    .matches(/^[a-z_]+$/)
    .withMessage('requirement_id solo puede contener letras minúsculas y guiones bajos'),
  
  body('name')
    .trim()
    .notEmpty()
    .withMessage('name es requerido')
    .isLength({ min: 3, max: 200 })
    .withMessage('name debe tener entre 3 y 200 caracteres'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('description debe tener máximo 500 caracteres'),
  
  body('required')
    .optional()
    .isBoolean()
    .withMessage('required debe ser true o false'),
  
  body('acceptedTypes')
    .optional()
    .isArray()
    .withMessage('acceptedTypes debe ser un array'),
  
  body('maxSize')
    .optional()
    .matches(/^\d+(\.\d+)?(KB|MB|GB)$/i)
    .withMessage('maxSize debe tener formato como "5MB", "10KB", etc.')
];

// ← RUTAS PÚBLICAS DE INFORMACIÓN
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Módulo de gestión de etapas funcionando correctamente',
    timestamp: new Date().toISOString(),
    routes: {
      admin_only: [
        'GET /api/stage-management/stages',
        'POST /api/stage-management/stages',
        'PUT /api/stage-management/stages/:stage_id',
        'DELETE /api/stage-management/stages/:stage_id',
        'GET /api/stage-management/stages/:stage_id/requirements',
        'POST /api/stage-management/stages/:stage_id/requirements',
        'PUT /api/stage-management/stages/:stage_id/requirements/:requirement_id',
        'DELETE /api/stage-management/stages/:stage_id/requirements/:requirement_id',
        'PUT /api/stage-management/reorder',
        'GET /api/stage-management/export'
      ]
    }
  });
});

// ← TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN DE ADMIN

// GET /api/stage-management/stages - Obtener todas las etapas
router.get('/stages', 
  authenticateToken,
  requireAdmin,
  logAuthenticatedRequest,
  StageManagementController.getAllStages
);

// POST /api/stage-management/stages - Crear nueva etapa
router.post('/stages', 
  authenticateToken,
  requireAdmin,
  createStageValidation,
  handleValidationErrors,
  logAuthenticatedRequest,
  StageManagementController.createStage
);

// PUT /api/stage-management/stages/:stage_id - Actualizar etapa
router.put('/stages/:stage_id', 
  authenticateToken,
  requireAdmin,
  param('stage_id').notEmpty().withMessage('stage_id es requerido'),
  handleValidationErrors,
  logAuthenticatedRequest,
  StageManagementController.updateStage
);

// DELETE /api/stage-management/stages/:stage_id - Eliminar etapa
router.delete('/stages/:stage_id', 
  authenticateToken,
  requireAdmin,
  param('stage_id').notEmpty().withMessage('stage_id es requerido'),
  handleValidationErrors,
  logAuthenticatedRequest,
  StageManagementController.deleteStage
);

// GET /api/stage-management/stages/:stage_id/requirements - Obtener requerimientos de etapa
router.get('/stages/:stage_id/requirements', 
  authenticateToken,
  requireAdmin,
  param('stage_id').notEmpty().withMessage('stage_id es requerido'),
  handleValidationErrors,
  logAuthenticatedRequest,
  StageManagementController.getRequirements
);

// POST /api/stage-management/stages/:stage_id/requirements - Agregar requerimiento
router.post('/stages/:stage_id/requirements', 
  authenticateToken,
  requireAdmin,
  param('stage_id').notEmpty().withMessage('stage_id es requerido'),
  requirementValidation,
  handleValidationErrors,
  logAuthenticatedRequest,
  StageManagementController.addRequirement
);

// PUT /api/stage-management/stages/:stage_id/requirements/:requirement_id - Actualizar requerimiento
router.put('/stages/:stage_id/requirements/:requirement_id', 
  authenticateToken,
  requireAdmin,
  param('stage_id').notEmpty().withMessage('stage_id es requerido'),
  param('requirement_id').notEmpty().withMessage('requirement_id es requerido'),
  handleValidationErrors,
  logAuthenticatedRequest,
  StageManagementController.updateRequirement
);

// DELETE /api/stage-management/stages/:stage_id/requirements/:requirement_id - Eliminar requerimiento
router.delete('/stages/:stage_id/requirements/:requirement_id', 
  authenticateToken,
  requireAdmin,
  param('stage_id').notEmpty().withMessage('stage_id es requerido'),
  param('requirement_id').notEmpty().withMessage('requirement_id es requerido'),
  handleValidationErrors,
  logAuthenticatedRequest,
  StageManagementController.deleteRequirement
);

// PUT /api/stage-management/reorder - Reordenar etapas
router.put('/reorder', 
  authenticateToken,
  requireAdmin,
  body('stage_orders').isArray().withMessage('stage_orders debe ser un array'),
  handleValidationErrors,
  logAuthenticatedRequest,
  StageManagementController.reorderStages
);

// GET /api/stage-management/export - Exportar configuración
router.get('/export', 
  authenticateToken,
  requireAdmin,
  logAuthenticatedRequest,
  StageManagementController.exportConfiguration
);

module.exports = router;