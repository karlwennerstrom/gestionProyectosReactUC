
const bcrypt = require('bcryptjs');
const { executeQuery } = require('../config/database');

// Función para actualizar contraseñas
const updatePasswords = async () => {
  try {
    console.log('🔐 Actualizando contraseñas de usuarios...');
    
    // Contraseña por defecto para todos los usuarios
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    console.log('🔒 Hash generado:', hashedPassword);
    
    // Actualizar todos los usuarios con la nueva contraseña hasheada
    const result = await executeQuery(
      'UPDATE users SET password = ? WHERE id IN (1, 2, 3, 4)',
      [hashedPassword]
    );
    
    console.log(`✅ ${result.affectedRows} contraseñas actualizadas`);
    
    // Mostrar usuarios actualizados
    const users = await executeQuery(
      'SELECT id, username, email, role, full_name FROM users ORDER BY id'
    );
    
    console.log('\n👥 Usuarios disponibles para login:');
    console.log('=====================================');
    users.forEach(user => {
      console.log(`🔹 Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Rol: ${user.role}`);
      console.log(`   Nombre: ${user.full_name}`);
      console.log(`   Password: ${defaultPassword}`);
      console.log('');
    });
    
    console.log('✅ ¡Listo! Ahora puedes hacer login con cualquiera de estos usuarios');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error actualizando contraseñas:', error);
    process.exit(1);
  }
};

// Ejecutar si se llama directamente
if (require.main === module) {
  updatePasswords();
}

module.exports = { updatePasswords };