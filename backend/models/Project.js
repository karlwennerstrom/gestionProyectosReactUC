const { executeQuery, getOne, insertAndGetId } = require('../config/database');
const emailService = require('../services/emailService');

class Project {

  // Generar código único para proyecto
  static async generateProjectCode() {
    try {
      const year = new Date().getFullYear();
      const result = await getOne(
        'SELECT COUNT(*) + 1 as next_number FROM projects WHERE code LIKE ?',
        [`PROJ-${year}-%`]
      );
      const nextNumber = result.next_number.toString().padStart(3, '0');
      return `PROJ-${year}-${nextNumber}`;
    } catch (error) {
      throw new Error(`Error generando código: ${error.message}`);
    }
  }

  // Buscar proyecto por ID
  static async findById(id) {
    try {
      const project = await getOne(`
        SELECT 
          p.*,
          u.full_name as user_name,
          u.email as user_email
        FROM projects p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `, [id]);
      
      if (project) {
        // Obtener etapas del proyecto
        project.stages = await this.getProjectStages(id);
      }
      
      return project;
    } catch (error) {
      throw new Error(`Error buscando proyecto: ${error.message}`);
    }
  }

  // Buscar proyecto por código
  static async findByCode(code) {
    try {
      const project = await getOne(`
        SELECT 
          p.*,
          u.full_name as user_name,
          u.email as user_email
        FROM projects p
        JOIN users u ON p.user_id = u.id
        WHERE p.code = ?
      `, [code]);
      
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
        const status = 'pending'; // Todas las etapas inician como pendientes
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

  // NUEVO: Obtener estado de una etapa específica
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

  // Obtener todos los proyectos (para admin)
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
        query += ' WHERE ' + conditions.join(' AND ');
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

  // Obtener proyectos de un usuario específico
  static async getByUserId(userId) {
    try {
      return await this.getAll({ user_id: userId });
    } catch (error) {
      throw new Error(`Error obteniendo proyectos del usuario: ${error.message}`);
    }
  }

  // Actualizar estado del proyecto (simplificado)
  static async updateStatus(id, status, adminComments = null) {
    try {
      await executeQuery(`
        UPDATE projects 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [status, id]);

      return await this.findById(id);
    } catch (error) {
      throw new Error(`Error actualizando estado: ${error.message}`);
    }
  }

  // Actualizar etapa específica (MEJORADO para sistema independiente)
  static async updateStage(projectId, stageName, status, adminComments = null) {
    try {
      await executeQuery(`
        UPDATE project_stages 
        SET status = ?, admin_comments = ?, 
            completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE project_id = ? AND stage_name = ?
      `, [status, adminComments, status, projectId, stageName]);

      // Si la etapa se aprueba (completed), actualizar el current_stage del proyecto si es necesario
      if (status === 'completed') {
        await this.updateCurrentStage(projectId);
      }

      return await this.getProjectStages(projectId);
    } catch (error) {
      throw new Error(`Error actualizando etapa: ${error.message}`);
    }
  }

  // NUEVO: Actualizar current_stage basado en las etapas completadas
  static async updateCurrentStage(projectId) {
    try {
      const stages = ['formalization', 'design', 'delivery', 'operation', 'maintenance'];
      
      // Encontrar la última etapa completada
      let lastCompletedStage = null;
      let nextStage = stages[0]; // Por defecto, la primera etapa
      
      for (let i = 0; i < stages.length; i++) {
        const stageStatus = await this.getStageStatus(projectId, stages[i]);
        
        if (stageStatus === 'completed') {
          lastCompletedStage = stages[i];
          // La siguiente etapa sería la próxima en la lista
          if (i + 1 < stages.length) {
            nextStage = stages[i + 1];
          } else {
            // Todas las etapas están completadas
            nextStage = stages[i]; // Mantener en la última etapa
          }
        } else {
          // Esta etapa no está completada, esta debería ser la current_stage
          nextStage = stages[i];
          break;
        }
      }

      // Actualizar current_stage en el proyecto
      await executeQuery(`
        UPDATE projects 
        SET current_stage = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [nextStage, projectId]);

      // Si todas las etapas están completadas, marcar el proyecto como aprobado
      const allCompleted = await this.areAllStagesCompleted(projectId);
      if (allCompleted) {
        await executeQuery(`
          UPDATE projects 
          SET status = 'approved', updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [projectId]);
      }

    } catch (error) {
      throw new Error(`Error actualizando current_stage: ${error.message}`);
    }
  }

  // NUEVO: Verificar si todas las etapas están completadas
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

  // Remover el método moveToNextStage ya que ahora es independiente
  // static async moveToNextStage() - YA NO SE USA

  // Estadísticas de proyectos
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
      `);
      return stats[0];
    } catch (error) {
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }
  }

  // Eliminar proyecto
  static async delete(id) {
    try {
      const result = await executeQuery('DELETE FROM projects WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error eliminando proyecto: ${error.message}`);
    }
  }
}

module.exports = Project;