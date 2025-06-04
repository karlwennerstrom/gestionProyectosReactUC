// backend/routes/projects.js - ACTUALIZADO CON ELIMINACIÓN LÓGICA
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const projectController = require('../controllers/projectController');
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

// Validaciones
const createProjectValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Título es requerido')
    .isLength({ min: 5, max: 200 })
    .withMessage('Título debe tener entre 5 y 200 caracteres'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Descripción es requerida')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Descripción debe tener entre 10 y 1000 caracteres')
];

const updateStatusValidation = [
  param('id').isInt().withMessage('ID debe ser un número'),
  body('status')
    .isIn(['pending', 'in-progress', 'approved', 'rejected'])
    .withMessage('Estado inválido'),
  body('admin_comments')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Comentarios demasiado largos')
];

const updateStageValidation = [
  param('id').isInt().withMessage('ID debe ser un número'),
  body('stage_name')
    .isIn(['formalization', 'design', 'delivery', 'operation', 'maintenance'])
    .withMessage('Etapa inválida'),
  body('status')
    .isIn(['pending', 'in-progress', 'completed', 'rejected'])
    .withMessage('Estado de etapa inválido'),
  body('admin_comments')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Comentarios demasiado largos')
];

const deleteValidation = [
  param('id').isInt().withMessage('ID debe ser un número'),
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Motivo demasiado largo')
];

// RUTAS PÚBLICAS DE INFORMACIÓN
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Módulo de proyectos funcionando correctamente',
    timestamp: new Date().toISOString(),
    new_features: [
      'Eliminación lógica de proyectos',
      'Gestión de proyectos eliminados',
      'Restauración de proyectos',
      'Gestión personalizada de etapas',
      'Notificaciones mejoradas por email'
    ],
    routes: {
      public: ['GET /api/projects/health'],
      user: [
        'GET /api/projects/my',
        'POST /api/projects',
        'GET /api/projects/:id'
      ],
      admin: [
        'GET /api/projects',
        'GET /api/projects/deleted', // ← NUEVO
        'PUT /api/projects/:id/status',
        'PUT /api/projects/:id/stage',
        'DELETE /api/projects/:id', // Ahora eliminación lógica
        'POST /api/projects/:id/restore', // ← NUEVO
        'DELETE /api/projects/:id/permanent', // ← NUEVO
        'GET /api/projects/stats',
        // Gestión de etapas
        'GET /api/projects/stages/management', // ← NUEVO
        'POST /api/projects/stages/custom', // ← NUEVO
        'PUT /api/projects/stages/custom/:stage_id', // ← NUEVO
        'DELETE /api/projects/stages/custom/:stage_id' // ← NUEVO
      ]
    }
  });
});

// RUTAS PROTEGIDAS - Requieren autenticación

// GET /api/projects/my - Obtener proyectos del usuario autenticado
router.get('/my', 
  authenticateToken,
  logAuthenticatedRequest,
  projectController.getMyProjects
);

// GET /api/projects/stats - Estadísticas (solo admin)
router.get('/stats', 
  authenticateToken,
  requireAdmin,
  logAuthenticatedRequest,
  projectController.getProjectStats
);

// ← NUEVO: GET /api/projects/deleted - Obtener proyectos eliminados (solo admin)
router.get('/deleted', 
  authenticateToken,
  requireAdmin,
  query('deleted_by').optional().isInt().withMessage('deleted_by debe ser un número'),
  handleValidationErrors,
  logAuthenticatedRequest,
  projectController.getDeletedProjects
);

// GET /api/projects/:id - Obtener proyecto específico
router.get('/:id', 
  authenticateToken,
  param('id').isInt().withMessage('ID debe ser un número'),
  query('include_deleted').optional().isBoolean().withMessage('include_deleted debe ser boolean'),
  handleValidationErrors,
  logAuthenticatedRequest,
  projectController.getProjectById
);

// GET /api/projects - Obtener todos los proyectos (admin) o proyectos del usuario
router.get('/', 
  authenticateToken,
  query('status').optional().isIn(['pending', 'in-progress', 'approved', 'rejected']),
  query('current_stage').optional().isIn(['formalization', 'design', 'delivery', 'operation', 'maintenance']),
  handleValidationErrors,
  logAuthenticatedRequest,
  projectController.getProjects
);

// POST /api/projects - Crear nuevo proyecto
router.post('/', 
  authenticateToken,
  createProjectValidation,
  handleValidationErrors,
  logAuthenticatedRequest,
  projectController.createProject
);

// PUT /api/projects/:id/status - Actualizar estado del proyecto (solo admin)
router.put('/:id/status', 
  authenticateToken,
  requireAdmin,
  updateStatusValidation,
  handleValidationErrors,
  logAuthenticatedRequest,
  projectController.updateProjectStatus
);

// PUT /api/projects/:id/stage - Actualizar etapa específica (solo admin)
router.put('/:id/stage', 
  authenticateToken,
  requireAdmin,
  updateStageValidation,
  handleValidationErrors,
  logAuthenticatedRequest,
  projectController.updateProjectStage
);

// DELETE /api/projects/:id - Eliminación lógica (solo admin)
router.delete('/:id', 
  authenticateToken,
  requireAdmin,
  deleteValidation,
  handleValidationErrors,
  logAuthenticatedRequest,
  projectController.deleteProject
);

// ← NUEVO: POST /api/projects/:id/restore - Restaurar proyecto (solo admin)
router.post('/:id/restore', 
  authenticateToken,
  requireAdmin,
  param('id').isInt().withMessage('ID debe ser un número'),
  handleValidationErrors,
  logAuthenticatedRequest,
  projectController.restoreProject
);

// ← NUEVO: DELETE /api/projects/:id/permanent - Eliminación permanente (solo admin)
router.delete('/:id/permanent', 
  authenticateToken,
  requireAdmin,
  param('id').isInt().withMessage('ID debe ser un número'),
  body('confirm').equals('ELIMINAR_PERMANENTE').withMessage('Confirmación requerida'),
  handleValidationErrors,
  logAuthenticatedRequest,
  projectController.permanentDeleteProject
);

// ═══════════════════════════════════════════════════════════
// RUTAS DE GESTIÓN DE ETAPAS Y REQUERIMIENTOS (SOLO ADMIN)
// ═══════════════════════════════════════════════════════════

// GET /api/projects/stages/management - Obtener configuración de etapas
router.get('/stages/management', 
  authenticateToken,
  requireAdmin,
  logAuthenticatedRequest,
  StageManagementController.getAllStagesAndRequirements
);

// GET /api/projects/stages/active - Obtener configuración activa para frontend
router.get('/stages/active', 
  authenticateToken,
  logAuthenticatedRequest,
  StageManagementController.getActiveConfiguration
);

// POST /api/projects/stages/custom - Crear etapa personalizada
router.post('/stages/custom', 
  authenticateToken,
  requireAdmin,
  body('stage_id')
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-z_]+$/)
    .withMessage('stage_id debe tener entre 3-50 caracteres y solo letras minúsculas y guiones bajos'),
  body('name')
    .isLength({ min: 3, max: 200 })
    .withMessage('name debe tener entre 3-200 caracteres'),
  body('description')
    .isLength({ min: 10, max: 1000 })
    .withMessage('description debe tener entre 10-1000 caracteres'),
  body('icon').optional().isLength({ max: 10 }),
  body('color').optional().isIn(['red', 'blue', 'green', 'orange', 'purple', 'yellow', 'pink']),
  body('display_order').optional().isInt({ min: 0, max: 999 }),
  handleValidationErrors,
  logAuthenticatedRequest,
  StageManagementController.createCustomStage
);

// PUT /api/projects/stages/custom/:stage_id - Actualizar etapa personalizada
router.put('/stages/custom/:stage_id', 
  authenticateToken,
  requireAdmin,
  param('stage_id').isLength({ min: 3, max: 50 }),
  body('name').optional().isLength({ min: 3, max: 200 }),
  body('description').optional().isLength({ min: 10, max: 1000 }),
  body('icon').optional().isLength({ max: 10 }),
  body('color').optional().isIn(['red', 'blue', 'green', 'orange', 'purple', 'yellow', 'pink']),
  body('display_order').optional().isInt({ min: 0, max: 999 }),
  handleValidationErrors,
  logAuthenticatedRequest,
  StageManagementController.updateCustomStage
);

// DELETE /api/projects/stages/custom/:stage_id - Eliminar etapa personalizada
router.delete('/stages/custom/:stage_id', 
  authenticateToken,
  requireAdmin,
  param('stage_id').isLength({ min: 3, max: 50 }),
  handleValidationErrors,
  logAuthenticatedRequest,
  StageManagementController.deleteCustomStage
);

// POST /api/projects/stages/:stage_id/requirements - Crear requerimiento personalizado
router.post('/stages/:stage_id/requirements', 
  authenticateToken,
  requireAdmin,
  param('stage_id').isLength({ min: 3, max: 50 }),
  body('requirement_id')
    .isLength({ min: 3, max: 100 })
    .matches(/^[a-z_]+$/)
    .withMessage('requirement_id debe tener entre 3-100 caracteres y solo letras minúsculas y guiones bajos'),
  body('name')
    .isLength({ min: 3, max: 300 })
    .withMessage('name debe tener entre 3-300 caracteres'),
  body('description')
    .isLength({ min: 10, max: 1000 })
    .withMessage('description debe tener entre 10-1000 caracteres'),
  body('required').optional().isBoolean(),
  body('accepted_types').optional().isArray(),
  body('max_size').optional().matches(/^\d+[KMGT]?B$/),
  body('display_order').optional().isInt({ min: 0, max: 999 }),
  handleValidationErrors,
  logAuthenticatedRequest,
  StageManagementController.createCustomRequirement
);

// PUT /api/projects/stages/:stage_id/requirements/:requirement_id - Actualizar requerimiento
router.put('/stages/:stage_id/requirements/:requirement_id', 
  authenticateToken,
  requireAdmin,
  param('stage_id').isLength({ min: 3, max: 50 }),
  param('requirement_id').isLength({ min: 3, max: 100 }),
  body('name').optional().isLength({ min: 3, max: 300 }),
  body('description').optional().isLength({ min: 10, max: 1000 }),
  body('required').optional().isBoolean(),
  body('accepted_types').optional().isArray(),
  body('max_size').optional().matches(/^\d+[KMGT]?B$/),
  body('display_order').optional().isInt({ min: 0, max: 999 }),
  handleValidationErrors,
  logAuthenticatedRequest,
  StageManagementController.updateCustomRequirement
);

// DELETE /api/projects/stages/:stage_id/requirements/:requirement_id - Eliminar requerimiento
router.delete('/stages/:stage_id/requirements/:requirement_id', 
  authenticateToken,
  requireAdmin,
  param('stage_id').isLength({ min: 3, max: 50 }),
  param('requirement_id').isLength({ min: 3, max: 100 }),
  handleValidationErrors,
  logAuthenticatedRequest,
  StageManagementController.deleteCustomRequirement
);

// POST /api/projects/stages/export - Exportar configuración
router.post('/stages/export', 
  authenticateToken,
  requireAdmin,
  logAuthenticatedRequest,
  StageManagementController.exportConfiguration
);

// POST /api/projects/stages/import - Importar configuración
router.post('/stages/import', 
  authenticateToken,
  requireAdmin,
  body('stages').optional().isArray(),
  body('requirements').optional().isArray(),
  body('overwrite').optional().isBoolean(),
  handleValidationErrors,
  logAuthenticatedRequest,
  StageManagementController.importConfiguration
);

// Test de email (mantenido)
router.post('/test-email', 
  authenticateToken,
  requireAdmin,
  body('email').isEmail().withMessage('Email válido requerido'),
  handleValidationErrors,
  logAuthenticatedRequest,
  projectController.testEmail
);

module.exports = router;