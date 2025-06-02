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

// RUTAS PÚBLICAS DE INFORMACIÓN
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Módulo de proyectos funcionando correctamente',
    timestamp: new Date().toISOString(),
    routes: {
      public: ['GET /api/projects/health'],
      user: [
        'GET /api/projects/my',
        'POST /api/projects',
        'GET /api/projects/:id'
      ],
      admin: [
        'GET /api/projects',
        'PUT /api/projects/:id/status',
        'PUT /api/projects/:id/stage',
        'POST /api/projects/:id/next-stage',
        'GET /api/projects/stats',
        'DELETE /api/projects/:id'
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

// GET /api/projects/:id - Obtener proyecto específico
router.get('/:id', 
  authenticateToken,
  param('id').isInt().withMessage('ID debe ser un número'),
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

// POST /api/projects/:id/next-stage - Mover a siguiente etapa (solo admin)
router.post('/:id/next-stage', 
  authenticateToken,
  requireAdmin,
  param('id').isInt().withMessage('ID debe ser un número'),
  body('admin_comments').optional().isLength({ max: 500 }),
  handleValidationErrors,
  logAuthenticatedRequest,
  projectController.moveToNextStage
);

// DELETE /api/projects/:id - Eliminar proyecto
router.delete('/:id', 
  authenticateToken,
  param('id').isInt().withMessage('ID debe ser un número'),
  handleValidationErrors,
  logAuthenticatedRequest,
  projectController.deleteProject
);

module.exports = router;