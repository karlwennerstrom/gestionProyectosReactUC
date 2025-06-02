const express = require('express');
const { param, query, validationResult } = require('express-validator');
const documentController = require('../controllers/documentController');
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
    message: 'Módulo de documentos funcionando correctamente',
    timestamp: new Date().toISOString(),
    maxFileSize: '10MB',
    allowedTypes: [
      'PDF', 'Word', 'Excel', 'PowerPoint', 
      'Text', 'Images (JPG, PNG, GIF)'
    ],
    routes: {
      public: ['GET /api/documents/health'],
      user: [
        'POST /api/documents/upload',
        'GET /api/documents/my',
        'GET /api/documents/project/:project_id',
        'GET /api/documents/:id',
        'GET /api/documents/:id/download',
        'DELETE /api/documents/:id'
      ],
      admin: [
        'GET /api/documents/stats',
        'GET /api/documents/search'
      ]
    }
  });
});

// RUTAS PROTEGIDAS - Requieren autenticación

// POST /api/documents/upload - Subir documento
router.post('/upload', 
  authenticateToken,
  logAuthenticatedRequest,
  documentController.uploadDocument
);

// GET /api/documents/my - Obtener mis documentos
router.get('/my', 
  authenticateToken,
  logAuthenticatedRequest,
  documentController.getMyDocuments
);

// GET /api/documents/stats - Estadísticas (solo admin)
router.get('/stats', 
  authenticateToken,
  requireAdmin,
  logAuthenticatedRequest,
  documentController.getDocumentStats
);

// GET /api/documents/search - Buscar documentos
router.get('/search', 
  authenticateToken,
  query('q').notEmpty().withMessage('Parámetro de búsqueda requerido'),
  handleValidationErrors,
  logAuthenticatedRequest,
  documentController.searchDocuments
);

// GET /api/documents/project/:project_id - Obtener documentos de un proyecto
router.get('/project/:project_id', 
  authenticateToken,
  param('project_id').isInt().withMessage('ID de proyecto debe ser un número'),
  query('stage_name').optional().isIn(['formalization', 'design', 'delivery', 'operation', 'maintenance']),
  handleValidationErrors,
  logAuthenticatedRequest,
  documentController.getProjectDocuments
);

// GET /api/documents/:id - Obtener información de documento específico
router.get('/:id', 
  authenticateToken,
  param('id').isInt().withMessage('ID debe ser un número'),
  handleValidationErrors,
  logAuthenticatedRequest,
  documentController.getDocumentById
);

// GET /api/documents/:id/download - Descargar documento
router.get('/:id/download', 
  authenticateToken,
  param('id').isInt().withMessage('ID debe ser un número'),
  handleValidationErrors,
  logAuthenticatedRequest,
  documentController.downloadDocument
);

// DELETE /api/documents/:id - Eliminar documento
router.delete('/:id', 
  authenticateToken,
  param('id').isInt().withMessage('ID debe ser un número'),
  handleValidationErrors,
  logAuthenticatedRequest,
  documentController.deleteDocument
);

module.exports = router;