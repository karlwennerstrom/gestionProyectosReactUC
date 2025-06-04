// backend/models/Project.js - CON ELIMINACIÓN LÓGICA
const { executeQuery, getOne, insertAndGetId } = require('../config/database');
const emailService = require('../services/emailService');

class Project {

  // Generar código único para proyecto
  static async generateProjectCode() {
    try {
      const year = new Date().getFullYear();
      const result = await getOne(
        'SELECT COUNT(*) + 1 as next_number FROM projects WHERE code LIKE ? AND deleted_at IS NULL',
        [`PROJ-${year}-%`]
      );
      const nextNumber = result.next_number.toString().padStart(3, '0');
      return `PROJ-${year}-${nextNumber}`;
    } catch (error) {
      throw new Error(`Error generando código: ${error.message}`);
    }
  }

  // Buscar proyecto por ID (solo activos)
  static async findById(id, includeDeleted = false) {
    try {
      let query = `
        SELECT 
          p.*,
          u.full_name as user_name,
          u.email as user_email,
          du.full_name as deleted_by_name
        FROM projects p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN users du ON p.deleted_by = du.id
        WHERE p.id = ?
      `;
      
      if (!includeDeleted) {
        query += ' AND p.deleted_at IS NULL';
      }
      
      const project = await getOne(query, [id]);
      
      if (project) {
        // Obtener etapas del proyecto
        project.stages = await this.getProjectStages(id);
      }
      
      return project;
    } catch (error) {
      throw new Error(`Error buscando proyecto: ${error.message}`);
    }
  }

  // Buscar proyecto por código (solo activos)
  static async findByCode(code, includeDeleted = false) {
    try {
      let query = `
        SELECT 
          p.*,
          u.full_name as user_name,
          u.email as user_email
        FROM projects p
        JOIN users u ON p.user_id = u.id
        WHERE p.code = ?
      `;
      
      if (!includeDeleted) {
        query += ' AND p.deleted_at IS NULL';
      }
      
      const project = await getOne(query, [code]);
      
      if (project) {
        project.stages = await this.getProjectStages(project.id);
      }
      
      return project;
    } catch (error) {
      throw new Error(`Error buscando proyecto por código: ${error.message}`);
    }
  }

  // Crear nuevo proyecto
  static async create(projectData) {
    try {
      const { title, description, user_id } = projectData;
      
      // Generar código único
      const code = await this.generateProjectCode();
      
      // Insertar proyecto
      const projectId = await insertAndGetId(`
        INSERT INTO projects (code, title, description, user_id, status, current_stage) 
        VALUES (?, ?, ?, ?, 'pending', 'formalization')
      `, [code, title, description, user_id]);

      // Crear todas las etapas por defecto
      await this.createDefaultStages(projectId);

      return await this.findById(projectId);
    } catch (error) {
      throw new Error(`Error creando proyecto: ${error.message}`);
    }
  }

  // Crear etapas por defecto para un proyecto
  static async createDefaultStages(projectId) {
    try {
      const stages = [
        'formalization',
        'design', 
        'delivery',
        'operation',
        'maintenance'
      ];

      for (let i = 0; i < stages.length; i++) {
        const status = 'pending';
        await executeQuery(`
          INSERT INTO project_stages (project_id, stage_name, status) 
          VALUES (?, ?, ?)
        `, [projectId, stages[i], status]);
      }
    } catch (error) {
      throw new Error(`Error creando etapas: ${error.message}`);
    }
  }

  // Obtener etapas de un proyecto
  static async getProjectStages(projectId) {
    try {
      const stages = await executeQuery(`
        SELECT * FROM project_stages 
        WHERE project_id = ? 
        ORDER BY 
          CASE stage_name 
            WHEN 'formalization' THEN 1
            WHEN 'design' THEN 2
            WHEN 'delivery' THEN 3
            WHEN 'operation' THEN 4
            WHEN 'maintenance' THEN 5
          END
      `, [projectId]);
      return stages;
    } catch (error) {
      throw new Error(`Error obteniendo etapas: ${error.message}`);
    }
  }

  // Obtener estado de una etapa específica
  static async getStageStatus(projectId, stageName) {
    try {
      const stage = await getOne(`
        SELECT status FROM project_stages 
        WHERE project_id = ? AND stage_name = ?
      `, [projectId, stageName]);
      
      return stage ? stage.status : 'pending';
    } catch (error) {
      throw new Error(`Error obteniendo estado de etapa: ${error.message}`);
    }
  }

  // Obtener todos los proyectos activos (para admin)
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT 
          p.*,
          u.full_name as user_name,
          u.email as user_email,
          COUNT(d.id) as document_count
        FROM projects p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN documents d ON p.id = d.project_id
        WHERE p.deleted_at IS NULL
      `;
      
      const conditions = [];
      const params = [];

      if (filters.status) {
        conditions.push('p.status = ?');
        params.push(filters.status);
      }

      if (filters.current_stage) {
        conditions.push('p.current_stage = ?');
        params.push(filters.current_stage);
      }

      if (filters.user_id) {
        conditions.push('p.user_id = ?');
        params.push(filters.user_id);
      }

      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }

      query += ` 
        GROUP BY p.id 
        ORDER BY p.created_at DESC
      `;

      return await executeQuery(query, params);
    } catch (error) {
      throw new Error(`Error obteniendo proyectos: ${error.message}`);
    }
  }

  // ← NUEVO: Obtener proyectos eliminados (solo admin)
  static async getDeleted(filters = {}) {
    try {
      let query = `
        SELECT 
          p.*,
          u.full_name as user_name,
          u.email as user_email,
          du.full_name as deleted_by_name,
          COUNT(d.id) as document_count
        FROM projects p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN users du ON p.deleted_by = du.id
        LEFT JOIN documents d ON p.id = d.project_id
        WHERE p.deleted_at IS NOT NULL
      `;
      
      const conditions = [];
      const params = [];

      if (filters.deleted_by) {
        conditions.push('p.deleted_by = ?');
        params.push(filters.deleted_by);
      }

      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }

      query += ` 
        GROUP BY p.id 
        ORDER BY p.deleted_at DESC
      `;

      return await executeQuery(query, params);
    } catch (error) {
      throw new Error(`Error obteniendo proyectos eliminados: ${error.message}`);
    }
  }

  // Obtener proyectos de un usuario específico (solo activos)
  static async getByUserId(userId) {
    try {
      return await this.getAll({ user_id: userId });
    } catch (error) {
      throw new Error(`Error obteniendo proyectos del usuario: ${error.message}`);
    }
  }

  // Actualizar estado del proyecto
  static async updateStatus(id, status, adminComments = null) {
    try {
      await executeQuery(`
        UPDATE projects 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND deleted_at IS NULL
      `, [status, id]);

      return await this.findById(id);
    } catch (error) {
      throw new Error(`Error actualizando estado: ${error.message}`);
    }
  }

  // Actualizar etapa específica
  static async updateStage(projectId, stageName, status, adminComments = null) {
    try {
      await executeQuery(`
        UPDATE project_stages 
        SET status = ?, admin_comments = ?, 
            completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE project_id = ? AND stage_name = ?
      `, [status, adminComments, status, projectId, stageName]);

      // Si la etapa se aprueba, actualizar el current_stage del proyecto
      if (status === 'completed') {
        await this.updateCurrentStage(projectId);
      }

      return await this.getProjectStages(projectId);
    } catch (error) {
      throw new Error(`Error actualizando etapa: ${error.message}`);
    }
  }

  // Actualizar current_stage basado en las etapas completadas
  static async updateCurrentStage(projectId) {
    try {
      const stages = ['formalization', 'design', 'delivery', 'operation', 'maintenance'];
      
      let lastCompletedStage = null;
      let nextStage = stages[0];
      
      for (let i = 0; i < stages.length; i++) {
        const stageStatus = await this.getStageStatus(projectId, stages[i]);
        
        if (stageStatus === 'completed') {
          lastCompletedStage = stages[i];
          if (i + 1 < stages.length) {
            nextStage = stages[i + 1];
          } else {
            nextStage = stages[i];
          }
        } else {
          nextStage = stages[i];
          break;
        }
      }

      await executeQuery(`
        UPDATE projects 
        SET current_stage = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND deleted_at IS NULL
      `, [nextStage, projectId]);

      const allCompleted = await this.areAllStagesCompleted(projectId);
      if (allCompleted) {
        await executeQuery(`
          UPDATE projects 
          SET status = 'approved', updated_at = CURRENT_TIMESTAMP 
          WHERE id = ? AND deleted_at IS NULL
        `, [projectId]);
      }

    } catch (error) {
      throw new Error(`Error actualizando current_stage: ${error.message}`);
    }
  }

  // Verificar si todas las etapas están completadas
  static async areAllStagesCompleted(projectId) {
    try {
      const result = await getOne(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM project_stages 
        WHERE project_id = ?
      `, [projectId]);

      return result.total === result.completed;
    } catch (error) {
      throw new Error(`Error verificando etapas completadas: ${error.message}`);
    }
  }

  // ← NUEVO: Eliminación lógica (soft delete)
  static async softDelete(id, deletedBy, reason = null) {
    try {
      // Verificar que el proyecto existe y no está eliminado
      const project = await this.findById(id);
      if (!project) {
        throw new Error('Proyecto no encontrado');
      }

      // Marcar como eliminado
      await executeQuery(`
        UPDATE projects 
        SET deleted_at = CURRENT_TIMESTAMP, 
            deleted_by = ?, 
            deletion_reason = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND deleted_at IS NULL
      `, [deletedBy, reason, id]);

      console.log(`✅ Proyecto ${project.code} eliminado lógicamente por usuario ${deletedBy}`);

      // Enviar notificación por email al propietario del proyecto
      try {
        const User = require('./User');
        const owner = await User.findById(project.user_id);
        const deletedByUser = await User.findById(deletedBy);
        
        if (owner && owner.email) {
          await emailService.notifyProjectDeleted(
            owner.email,
            owner.full_name,
            project.code,
            project.title,
            deletedByUser.full_name,
            reason
          );
          console.log(`📧 Notificación de eliminación enviada a ${owner.email}`);
        }
      } catch (emailError) {
        console.error('❌ Error enviando notificación de eliminación:', emailError);
        // No fallar la operación por error de email
      }

      return true;
    } catch (error) {
      throw new Error(`Error eliminando proyecto: ${error.message}`);
    }
  }

  // ← NUEVO: Restaurar proyecto eliminado
  static async restore(id, restoredBy) {
    try {
      const project = await this.findById(id, true); // incluir eliminados
      if (!project) {
        throw new Error('Proyecto no encontrado');
      }

      if (!project.deleted_at) {
        throw new Error('El proyecto no está eliminado');
      }

      await executeQuery(`
        UPDATE projects 
        SET deleted_at = NULL, 
            deleted_by = NULL, 
            deletion_reason = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [id]);

      console.log(`✅ Proyecto ${project.code} restaurado por usuario ${restoredBy}`);

      // Enviar notificación de restauración
      try {
        const User = require('./User');
        const owner = await User.findById(project.user_id);
        const restoredByUser = await User.findById(restoredBy);
        
        if (owner && owner.email) {
          await emailService.notifyProjectRestored(
            owner.email,
            owner.full_name,
            project.code,
            project.title,
            restoredByUser.full_name
          );
          console.log(`📧 Notificación de restauración enviada a ${owner.email}`);
        }
      } catch (emailError) {
        console.error('❌ Error enviando notificación de restauración:', emailError);
      }

      return await this.findById(id);
    } catch (error) {
      throw new Error(`Error restaurando proyecto: ${error.message}`);
    }
  }

  // Eliminación física (solo para casos extremos)
  static async hardDelete(id) {
    try {
      const result = await executeQuery('DELETE FROM projects WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error eliminando proyecto permanentemente: ${error.message}`);
    }
  }

  // Estadísticas de proyectos (solo activos)
  static async getStats() {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total_projects,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_projects_last_30_days
        FROM projects
        WHERE deleted_at IS NULL
      `);
      return stats[0];
    } catch (error) {
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }
  }

  // ← NUEVO: Estadísticas de eliminación
  static async getDeletionStats() {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total_deleted,
          COUNT(DISTINCT deleted_by) as deleted_by_users,
          SUM(CASE WHEN deleted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as deleted_last_30_days,
          SUM(CASE WHEN deleted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as deleted_last_7_days
        FROM projects
        WHERE deleted_at IS NOT NULL
      `);
      return stats[0];
    } catch (error) {
      throw new Error(`Error obteniendo estadísticas de eliminación: ${error.message}`);
    }
  }
}

module.exports = Project;