const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken, logAuthenticatedRequest } = require('../middleware/auth');

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

// Validaciones para login
const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username es requerido')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username debe tener entre 3 y 50 caracteres'),
  
  body('password')
    .notEmpty()
    .withMessage('Password es requerido')
    .isLength({ min: 6 })
    .withMessage('Password debe tener al menos 6 caracteres')
];

// Validaciones para registro
const registerValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username es requerido')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username solo puede contener letras, números y guiones bajos'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email es requerido')
    .isEmail()
    .withMessage('Formato de email inválido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password es requerido')
    .isLength({ min: 6, max: 100 })
    .withMessage('Password debe tener entre 6 y 100 caracteres'),
  
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Nombre completo es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre completo debe tener entre 2 y 100 caracteres'),
  
  body('role')
    .optional()
    .isIn(['admin', 'user'])
    .withMessage('Rol debe ser admin o user')
];

// Validaciones para actualizar perfil
const updateProfileValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email es requerido')
    .isEmail()
    .withMessage('Formato de email inválido')
    .normalizeEmail(),
  
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Nombre completo es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre completo debe tener entre 2 y 100 caracteres')
];

// Validaciones para cambiar contraseña
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Contraseña actual es requerida'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('Nueva contraseña es requerida')
    .isLength({ min: 6, max: 100 })
    .withMessage('Nueva contraseña debe tener entre 6 y 100 caracteres')
];

// RUTAS PÚBLICAS (no requieren autenticación)

// POST /api/auth/login - Iniciar sesión
router.post('/login', 
  loginValidation,
  handleValidationErrors,
  authController.login
);

// POST /api/auth/register - Registrar usuario (temporal para desarrollo)
router.post('/register', 
  registerValidation,
  handleValidationErrors,
  authController.register
);

// RUTAS PROTEGIDAS (requieren autenticación)

// GET /api/auth/profile - Obtener perfil del usuario autenticado
router.get('/profile', 
  authenticateToken,
  logAuthenticatedRequest,
  authController.getProfile
);

// PUT /api/auth/profile - Actualizar perfil del usuario autenticado
router.put('/profile', 
  authenticateToken,
  updateProfileValidation,
  handleValidationErrors,
  logAuthenticatedRequest,
  authController.updateProfile
);

// PUT /api/auth/change-password - Cambiar contraseña
router.put('/change-password', 
  authenticateToken,
  changePasswordValidation,
  handleValidationErrors,
  logAuthenticatedRequest,
  authController.changePassword
);

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', 
  authenticateToken,
  logAuthenticatedRequest,
  authController.logout
);

// GET /api/auth/verify - Verificar token (para frontend)
router.get('/verify', 
  authenticateToken,
  authController.verifyToken
);

// RUTA DE SALUD DE AUTENTICACIÓN
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Módulo de autenticación funcionando correctamente',
    timestamp: new Date().toISOString(),
    routes: {
      public: [
        'POST /api/auth/login',
        'POST /api/auth/register',
        'GET /api/auth/health'
      ],
      protected: [
        'GET /api/auth/profile',
        'PUT /api/auth/profile',
        'PUT /api/auth/change-password',
        'POST /api/auth/logout',
        'GET /api/auth/verify'
      ]
    }
  });
});

module.exports = router;