// backend/server.js
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
const requirementRoutes = require('./routes/requirements'); // ← NUEVA RUTA

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

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/requirements', requirementRoutes); // ← NUEVA RUTA

// Ruta de salud del servidor
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Sistema UC Backend funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '2.0.0', // ← Actualizada versión
    endpoints: {
      auth: '/api/auth',
      projects: '/api/projects', 
      documents: '/api/documents',
      requirements: '/api/requirements' // ← NUEVO ENDPOINT
    }
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/auth/health',
      'POST /api/auth/login',
      'GET /api/projects/health',
      'GET /api/documents/health',
      'GET /api/requirements/health' // ← NUEVO ENDPOINT
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
    console.log('🚀 Iniciando Sistema UC Backend v2.0...');
    
    // Probar conexión a base de datos
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ No se pudo conectar a la base de datos');
      console.log('📝 Verifica tu configuración en el archivo .env');
      process.exit(1);
    }
    
    // Verificar estructura de base de datos
    await initDatabase();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/health`);
      console.log(`📋 Endpoints disponibles:`);
      console.log(`   - GET  /api/health`);
      console.log(`   - GET  /api/auth/health`);
      console.log(`   - POST /api/auth/login`);
      console.log(`   - POST /api/auth/register`);
      console.log(`   - GET  /api/projects/health`);
      console.log(`   - GET  /api/documents/health`);
      console.log(`   - GET  /api/requirements/health`); // ← NUEVO LOG
      console.log('');
      console.log('🆕 NUEVAS FUNCIONALIDADES v2.0:');
      console.log('   ✅ Validación por requerimiento individual');
      console.log('   ✅ Historial de documentos con versiones');
      console.log('   ✅ Aprobación masiva por etapa');
      console.log('   ✅ Informes finales automáticos');
      console.log('   ✅ Notificaciones granulares por email');
    });
    
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

// Inicializar servidor
startServer();