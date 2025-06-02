const { executeQuery, getOne, insertAndGetId } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  
  // Buscar usuario por ID
  static async findById(id) {
    try {
      const user = await getOne(
        'SELECT id, username, email, role, full_name, created_at FROM users WHERE id = ?',
        [id]
      );
      return user;
    } catch (error) {
      throw new Error(`Error buscando usuario por ID: ${error.message}`);
    }
  }

  // Buscar usuario por username
  static async findByUsername(username) {
    try {
      const user = await getOne(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );
      return user;
    } catch (error) {
      throw new Error(`Error buscando usuario por username: ${error.message}`);
    }
  }

  // Buscar usuario por email
  static async findByEmail(email) {
    try {
      const user = await getOne(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      return user;
    } catch (error) {
      throw new Error(`Error buscando usuario por email: ${error.message}`);
    }
  }

  // Crear nuevo usuario
  static async create(userData) {
    try {
      const { username, email, password, full_name, role = 'user' } = userData;

      // Verificar si el usuario ya existe
      const existingUser = await this.findByUsername(username);
      if (existingUser) {
        throw new Error('El usuario ya existe');
      }

      const existingEmail = await this.findByEmail(email);
      if (existingEmail) {
        throw new Error('El email ya está registrado');
      }

      // Encriptar contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insertar usuario
      const userId = await insertAndGetId(
        'INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
        [username, email, hashedPassword, full_name, role]
      );

      // Retornar usuario sin contraseña
      return await this.findById(userId);
    } catch (error) {
      throw new Error(`Error creando usuario: ${error.message}`);
    }
  }

  // Validar contraseña
  static async validatePassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      throw new Error(`Error validando contraseña: ${error.message}`);
    }
  }

  // Obtener todos los usuarios (solo para admin)
  static async getAll() {
    try {
      const users = await executeQuery(
        'SELECT id, username, email, role, full_name, created_at FROM users ORDER BY created_at DESC'
      );
      return users;
    } catch (error) {
      throw new Error(`Error obteniendo usuarios: ${error.message}`);
    }
  }

  // Actualizar usuario
  static async update(id, userData) {
    try {
      const { username, email, full_name, role } = userData;
      
      await executeQuery(
        'UPDATE users SET username = ?, email = ?, full_name = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [username, email, full_name, role, id]
      );

      return await this.findById(id);
    } catch (error) {
      throw new Error(`Error actualizando usuario: ${error.message}`);
    }
  }

  // Eliminar usuario
  static async delete(id) {
    try {
      const result = await executeQuery('DELETE FROM users WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error eliminando usuario: ${error.message}`);
    }
  }

  // Cambiar contraseña
  static async changePassword(id, oldPassword, newPassword) {
    try {
      const user = await getOne('SELECT password FROM users WHERE id = ?', [id]);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const isValidPassword = await this.validatePassword(oldPassword, user.password);
      if (!isValidPassword) {
        throw new Error('Contraseña actual incorrecta');
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await executeQuery(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedNewPassword, id]
      );

      return true;
    } catch (error) {
      throw new Error(`Error cambiando contraseña: ${error.message}`);
    }
  }

  // Estadísticas de usuarios
  static async getStats() {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
          SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as users,
          SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_users_last_30_days
        FROM users
      `);
      return stats[0];
    } catch (error) {
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }
  }
}

module.exports = User;