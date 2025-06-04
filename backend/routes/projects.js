// backend/routes/projects.js - VERSIÓN LIMPIA QUE FUNCIONA
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const projectController = require('../controllers/projectController');
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

// ══════════════════════════════════════════════════════════
// VALIDACIONES
// ══════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════
// RUTAS PÚBLICAS
// ══════════════════════════════════════════════════════════

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Módulo de proyectos funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '2.0',
    features: [
      'Eliminación lógica de proyectos',
      'Restauración de proyectos',
      'Notificaciones por email',
      'Gestión de etapas'
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
        'GET /api/projects/deleted',
        'GET /api/projects/stats',
        'PUT /api/projects/:id/status',
        'PUT /api/projects/:id/stage',
        'DELETE /api/projects/:id',
        'POST /api/projects/:id/restore',
        'DELETE /api/projects/:id/permanent',
        'POST /api/projects/test-email'
      ]
    }
  });
});

// ══════════════════════════════════════════════════════════
// RUTAS PROTEGIDAS - USUARIOS
// ══════════════════════════════════════════════════════════

// GET /api/projects/my - Obtener proyectos del usuario autenticado
router.get('/my', 
  authenticateToken,
  logAuthenticatedRequest,
  projectController.getMyProjects
);

// POST /api/projects - Crear nuevo proyecto
router.post('/', 
  authenticateToken,
  createProjectValidation,
  handleValidationErrors,
  logAuthenticatedRequest,
  projectController.createProject
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

// ══════════════════════════════════════════════════════════
// RUTAS PROTEGIDAS - SOLO ADMIN
// ══════════════════════════════════════════════════════════

// GET /api/projects/stats - Estadísticas (solo admin)
router.get('/stats', 
  authenticateToken,
  requireAdmin,
  logAuthenticatedRequest,
  projectController.getProjectStats
);

// GET /api/projects/deleted - Obtener proyectos eliminados (solo admin)
router.get('/deleted', 
  authenticateToken,
  requireAdmin,
  query('deleted_by').optional().isInt().withMessage('deleted_by debe ser un número'),
  handleValidationErrors,
  logAuthenticatedRequest,
  projectController.getDeletedProjects
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

// POST /api/projects/:id/restore - Restaurar proyecto (solo admin)
router.post('/:id/restore', 
  authenticateToken,
  requireAdmin,
  param('id').isInt().withMessage('ID debe ser un número'),
  handleValidationErrors,
  logAuthenticatedRequest,
  projectController.restoreProject
);

// DELETE /api/projects/:id/permanent - Eliminación permanente (solo admin)
router.delete('/:id/permanent', 
  authenticateToken,
  requireAdmin,
  param('id').isInt().withMessage('ID debe ser un número'),
  body('confirm').equals('ELIMINAR_PERMANENTE').withMessage('Confirmación requerida'),
  handleValidationErrors,
  logAuthenticatedRequest,
  projectController.permanentDeleteProject
);

// POST /api/projects/test-email - Test de email (solo admin)
router.post('/test-email', 
  authenticateToken,
  requireAdmin,
  body('email').isEmail().withMessage('Email válido requerido'),
  handleValidationErrors,
  logAuthenticatedRequest,
  projectController.testEmail
);

module.exports = router;