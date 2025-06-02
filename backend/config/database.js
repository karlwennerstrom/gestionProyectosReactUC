const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de la conexión a MySQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'sistema_uc',
  charset: 'utf8mb4',
  timezone: '+00:00',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Pool de conexiones para mejor rendimiento
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Removidas las opciones inválidas: acquireTimeout, timeout, reconnect
});

// Función para ejecutar consultas
const executeQuery = async (query, params = []) => {
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('Error ejecutando consulta:', error);
    throw error;
  }
};

// Función para obtener una sola fila
const getOne = async (query, params = []) => {
  try {
    const results = await executeQuery(query, params);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error obteniendo registro:', error);
    throw error;
  }
};

// Función para insertar y retornar el ID
const insertAndGetId = async (query, params = []) => {
  try {
    const [result] = await pool.execute(query, params);
    return result.insertId;
  } catch (error) {
    console.error('Error insertando registro:', error);
    throw error;
  }
};

// Función para probar la conexión
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión a MySQL establecida correctamente');
    
    // Probar consulta simple
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Consulta de prueba exitosa');
    
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error.message);
    return false;
  }
};

// Función para inicializar la base de datos
const initDatabase = async () => {
  try {
    console.log('🔍 Verificando estructura de base de datos...');
    
    // Verificar que las tablas existen
    const tables = await executeQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME]);
    
    const tableNames = tables.map(table => table.TABLE_NAME);
    const requiredTables = ['users', 'projects', 'project_stages', 'documents'];
    
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      console.warn(`⚠️  Tablas faltantes: ${missingTables.join(', ')}`);
      console.log('📝 Por favor ejecuta el script de creación de base de datos');
      return false;
    }
    
    console.log('✅ Todas las tablas requeridas están presentes');
    
    // Verificar datos básicos
    const userCount = await getOne('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Usuarios en base de datos: ${userCount.count}`);
    
    if (userCount.count === 0) {
      console.warn('⚠️  No hay usuarios en la base de datos');
      console.log('📝 Ejecuta el script de inserción de datos de prueba');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error.message);
    return false;
  }
};

// Cerrar el pool de conexiones
const closePool = async () => {
  try {
    await pool.end();
    console.log('✅ Pool de conexiones cerrado');
  } catch (error) {
    console.error('❌ Error cerrando pool:', error);
  }
};

// Manejo de señales para cerrar conexiones
process.on('SIGINT', async () => {
  console.log('\n🔄 Cerrando conexiones a base de datos...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Cerrando conexiones a base de datos...');
  await closePool();
  process.exit(0);
});

module.exports = {
  pool,
  executeQuery,
  getOne,
  insertAndGetId,
  testConnection,
  initDatabase,
  closePool
};