const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario existe en la base de datos
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido - usuario no encontrado'
      });
    }

    // Agregar información del usuario al request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    };

    next();
  } catch (error) {
    console.error('Error en autenticación:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware para verificar rol de administrador
const requireAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado - Se requieren permisos de administrador'
      });
    }

    next();
  } catch (error) {
    console.error('Error verificando rol admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware para verificar que el usuario puede acceder al recurso
const requireOwnershipOrAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Si es admin, puede acceder a todo
    if (req.user.role === 'admin') {
      return next();
    }

    // Si es user, solo puede acceder a sus propios recursos
    const resourceUserId = req.params.userId || req.body.user_id || req.query.user_id;
    
    if (resourceUserId && parseInt(resourceUserId) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado - Solo puedes acceder a tus propios recursos'
      });
    }

    next();
  } catch (error) {
    console.error('Error verificando ownership:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware opcional de autenticación (no falla si no hay token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (user) {
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // En caso de error, simplemente continuar sin usuario
    req.user = null;
    next();
  }
};

// Middleware para logging de requests autenticados
const logAuthenticatedRequest = (req, res, next) => {
  if (req.user) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Usuario: ${req.user.username} (${req.user.role})`);
  }
  next();
};

// Middleware para rate limiting básico por usuario
const rateLimitByUser = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Limpiar requests antiguos
    if (requests.has(userId)) {
      const userRequests = requests.get(userId).filter(time => time > windowStart);
      requests.set(userId, userRequests);
    } else {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);

    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Demasiadas peticiones. Intenta de nuevo más tarde.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    userRequests.push(now);
    next();
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireOwnershipOrAdmin,
  optionalAuth,
  logAuthenticatedRequest,
  rateLimitByUser
};