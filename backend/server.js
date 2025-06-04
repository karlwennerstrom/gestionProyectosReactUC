// backend/server.js - Actualización para incluir rutas CAS
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Importar configuración de base de datos
const { testConnection, initDatabase } = require('./config/database');

// Importar rutas
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const documentRoutes = require('./routes/documents');
const emailRoutes = require('./routes/email'); 
const requirementRoutes = require('./routes/requirements'); 
const aiRoutes = require('./routes/ai');
const casRoutes = require('./routes/cas'); // ← NUEVA RUTA CAS
const stageManagementRoutes = require('./routes/stage-management'); // ← AGREGAR ESTA LÍNEA

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware de seguridad
app.use(helmet());

// Configurar CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ← RUTAS DE LA API - INCLUYENDO CAS
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/requirements', requirementRoutes); 
app.use('/api/ai', aiRoutes);
app.use('/api/cas', casRoutes); // ← NUEVA RUTA CAS
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.originalUrl}`);
  
  // Log específico para rutas CAS
  if (req.originalUrl.includes('/cas/')) {
    console.log('🎫 CAS Request Details:', {
      method: req.method,
      url: req.originalUrl,
      headers: {
        'user-agent': req.get('user-agent'),
        'referer': req.get('referer'),
        'host': req.get('host')
      },
      query: req.query,
      body: req.body
    });
  }
  
  next();
});
app.use('/api/stage-management', stageManagementRoutes); // ← AGREGAR ESTA LÍNEA

// ← TEST ENDPOINT ESPECÍFICO PARA CAS
app.get('/api/cas/test', (req, res) => {
  console.log('🧪 Test endpoint CAS llamado');
  res.json({
    success: true,
    message: 'Test endpoint CAS funcionando',
    timestamp: new Date().toISOString(),
    request_details: {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      headers: req.headers
    }
  });
});
// Health check principal
app.get('/api/health', async (req, res) => {
  const ollamaService = require('./services/ollamaService');
  const ollamaStatus = await ollamaService.verifyConnection();
  
  // Verificar estado de CAS
  const casService = require('./services/casService');
  const casStatus = {
    enabled: casService.isEnabled(),
    base_url: process.env.CAS_BASE_URL || 'No configurado',
    auto_create_users: process.env.CAS_AUTO_CREATE_USERS === 'true'
  };
  
  res.json({
    status: 'OK',
    message: 'Sistema UC Backend funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '2.1.0', // ← Actualizada versión
    services: {
      database: 'OK',
      ollama: ollamaStatus.connected ? 'OK' : 'ERROR',
      ollama_details: ollamaStatus,
      cas: casStatus.enabled ? 'OK' : 'DISABLED', // ← NUEVO
      cas_details: casStatus // ← NUEVO
    },
    endpoints: {
      auth: '/api/auth',
      projects: '/api/projects',
      documents: '/api/documents',
      email: '/api/email',
      requirements: '/api/requirements',
      ai: '/api/ai',
      cas: '/api/cas',
          'stage-management': '/api/stage-management' // ← AGREGAR ESTA LÍNEA
    }
  });
});

// ← MIDDLEWARE DE DEBUGGING PARA VER TODAS LAS RUTAS
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  console.log(`❌ Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/auth/health',
      'POST /api/auth/login',
      'GET /api/projects/health',
      'GET /api/documents/health',
      'GET /api/requirements/health',
      'GET /api/requirements/project/:project_id',
      'POST /api/ai/chat',
      'GET /api/ai/knowledge',
      'GET /api/cas/health', // ← NUEVO
      'GET /api/cas/login', // ← NUEVO
      'GET /api/cas/callback', // ← NUEVO
      'GET /api/cas/logout' // ← NUEVO
    ]
  });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Función para inicializar el servidor
const startServer = async () => {
  try {
    console.log('🚀 Iniciando Sistema UC Backend v2.1 con CAS...');
    
    // Probar conexión a base de datos
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ No se pudo conectar a la base de datos');
      console.log('📝 Verifica tu configuración en el archivo .env');
      process.exit(1);
    }
    
    // Verificar estructura de base de datos
    await initDatabase();
    
    // Verificar configuración CAS
    const casService = require('./services/casService');
    if (casService.isEnabled()) {
      console.log('🏛️ CAS habilitado');
      console.log(`   - URL base: ${process.env.CAS_BASE_URL}`);
      console.log(`   - Auto-crear usuarios: ${process.env.CAS_AUTO_CREATE_USERS === 'true' ? 'SÍ' : 'NO'}`);
      console.log(`   - Frontend URL: ${process.env.FRONTEND_URL}`);
    } else {
      console.log('⚪ CAS deshabilitado');
    }
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/health`);
      console.log(`🗂️ Requirements endpoints: http://localhost:${PORT}/api/requirements/health`);
      console.log(`🏛️ CAS endpoints: http://localhost:${PORT}/api/cas/health`); // ← NUEVO
      console.log(`📋 Endpoints disponibles:`);
      console.log(`   - GET  /api/health`);
      console.log(`   - GET  /api/auth/health`);
      console.log(`   - POST /api/auth/login`);
      console.log(`   - POST /api/auth/register`);
      console.log(`   - GET  /api/projects/health`);
      console.log(`   - GET  /api/documents/health`);
      console.log(`   - GET  /api/requirements/health`);
      console.log(`   - GET  /api/requirements/project/:project_id`);
      console.log(`   - GET  /api/cas/health`); // ← NUEVO
      console.log(`   - GET  /api/cas/login`); // ← NUEVO
      console.log(`   - GET  /api/cas/callback`); // ← NUEVO
      console.log(`   - GET  /api/cas/logout`); // ← NUEVO
      console.log('');
      console.log('🆕 NUEVAS FUNCIONALIDADES v2.1:');
      console.log('   ✅ Integración completa con CAS UC');
      console.log('   ✅ Login dual (CAS + tradicional)');
      console.log('   ✅ Auto-creación de usuarios desde CAS');
      console.log('   ✅ Detección automática de roles por email');
      console.log('   ✅ Logout centralizado con CAS');
    });
    
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

// Inicializar servidor
startServer();