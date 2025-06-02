const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generar JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Login de usuario
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validar campos requeridos
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username y password son requeridos'
      });
    }

    // Buscar usuario
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Validar contraseña
    const isValidPassword = await User.validatePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Generar token
    const token = generateToken(user);

    // Enviar respuesta sin contraseña
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: userWithoutPassword,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Registro de usuario (solo para admin o desarrollo)
const register = async (req, res) => {
  try {
    const { username, email, password, full_name, role = 'user' } = req.body;

    // Validar campos requeridos
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
      });
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Crear usuario
    const newUser = await User.create({
      username,
      email,
      password,
      full_name,
      role
    });

    // Generar token
    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        user: newUser,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    
    if (error.message.includes('ya existe') || error.message.includes('ya está registrado')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener perfil del usuario autenticado
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar perfil del usuario
const updateProfile = async (req, res) => {
  try {
    const { full_name, email } = req.body;
    const userId = req.user.id;

    // Validar campos
    if (!full_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nombre completo y email son requeridos'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
      });
    }

    // Obtener datos actuales del usuario
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Actualizar usuario
    const updatedUser = await User.update(userId, {
      username: currentUser.username,
      email,
      full_name,
      role: currentUser.role
    });

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    
    if (error.message.includes('ya está registrado')) {
      return res.status(409).json({
        success: false,
        message: 'El email ya está en uso'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Cambiar contraseña
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validar campos
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual y nueva contraseña son requeridas'
      });
    }

    // Validar longitud de nueva contraseña
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Cambiar contraseña
    await User.changePassword(userId, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente'
    });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    
    if (error.message.includes('incorrecta')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Logout (principalmente para limpiar token del lado del cliente)
const logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logout exitoso'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Verificar token (middleware endpoint)
const verifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Error verificando token:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  verifyToken
};