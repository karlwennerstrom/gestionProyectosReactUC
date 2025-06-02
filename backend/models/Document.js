const { executeQuery, getOne, insertAndGetId } = require('../config/database');
const path = require('path');
const fs = require('fs').promises;

class Document {

  // Crear nuevo documento con requerimiento específico
  static async create(documentData) {
    try {
      const { 
        project_id, 
        stage_name, 
        requirement_id, // NUEVO: ID del requerimiento específico
        file_name, 
        original_name, 
        file_path, 
        file_size, 
        mime_type, 
        uploaded_by 
      } = documentData;

      const documentId = await insertAndGetId(`
        INSERT INTO documents 
        (project_id, stage_name, requirement_id, file_name, original_name, file_path, file_size, mime_type, uploaded_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [project_id, stage_name, requirement_id, file_name, original_name, file_path, file_size, mime_type, uploaded_by]);

      return await this.findById(documentId);
    } catch (error) {
      throw new Error(`Error creando documento: ${error.message}`);
    }
  }

  // Buscar documento por ID
  static async findById(id) {
    try {
      const document = await getOne(`
        SELECT 
          d.*,
          u.full_name as uploaded_by_name,
          u.username as uploaded_by_username,
          p.code as project_code,
          p.title as project_title
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        JOIN projects p ON d.project_id = p.id
        WHERE d.id = ?
      `, [id]);
      
      return document;
    } catch (error) {
      throw new Error(`Error buscando documento: ${error.message}`);
    }
  }

  // Obtener documentos por proyecto
  static async getByProject(projectId) {
    try {
      const documents = await executeQuery(`
        SELECT 
          d.*,
          u.full_name as uploaded_by_name,
          u.username as uploaded_by_username
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        WHERE d.project_id = ?
        ORDER BY d.stage_name, d.requirement_id, d.uploaded_at DESC
      `, [projectId]);
      
      return documents;
    } catch (error) {
      throw new Error(`Error obteniendo documentos del proyecto: ${error.message}`);
    }
  }

  // Obtener documentos por proyecto y etapa
  static async getByProjectAndStage(projectId, stageName) {
    try {
      const documents = await executeQuery(`
        SELECT 
          d.*,
          u.full_name as uploaded_by_name,
          u.username as uploaded_by_username
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        WHERE d.project_id = ? AND d.stage_name = ?
        ORDER BY d.requirement_id, d.uploaded_at DESC
      `, [projectId, stageName]);
      
      return documents;
    } catch (error) {
      throw new Error(`Error obteniendo documentos de la etapa: ${error.message}`);
    }
  }

  // NUEVO: Obtener documento por proyecto, etapa y requerimiento específico
  static async getByRequirement(projectId, stageName, requirementId) {
    try {
      const document = await getOne(`
        SELECT 
          d.*,
          u.full_name as uploaded_by_name,
          u.username as uploaded_by_username
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        WHERE d.project_id = ? AND d.stage_name = ? AND d.requirement_id = ?
        ORDER BY d.uploaded_at DESC
        LIMIT 1
      `, [projectId, stageName, requirementId]);
      
      return document;
    } catch (error) {
      throw new Error(`Error obteniendo documento del requerimiento: ${error.message}`);
    }
  }

  // NUEVO: Obtener todos los documentos por requerimiento (para mostrar historial)
  static async getAllByRequirement(projectId, stageName, requirementId) {
    try {
      const documents = await executeQuery(`
        SELECT 
          d.*,
          u.full_name as uploaded_by_name,
          u.username as uploaded_by_username
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        WHERE d.project_id = ? AND d.stage_name = ? AND d.requirement_id = ?
        ORDER BY d.uploaded_at DESC
      `, [projectId, stageName, requirementId]);
      
      return documents;
    } catch (error) {
      throw new Error(`Error obteniendo historial de documentos del requerimiento: ${error.message}`);
    }
  }

  // Obtener todos los documentos (para admin)
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT 
          d.*,
          u.full_name as uploaded_by_name,
          u.username as uploaded_by_username,
          p.code as project_code,
          p.title as project_title
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        JOIN projects p ON d.project_id = p.id
      `;
      
      const conditions = [];
      const params = [];

      if (filters.project_id) {
        conditions.push('d.project_id = ?');
        params.push(filters.project_id);
      }

      if (filters.stage_name) {
        conditions.push('d.stage_name = ?');
        params.push(filters.stage_name);
      }

      if (filters.requirement_id) {
        conditions.push('d.requirement_id = ?');
        params.push(filters.requirement_id);
      }

      if (filters.uploaded_by) {
        conditions.push('d.uploaded_by = ?');
        params.push(filters.uploaded_by);
      }

      if (filters.mime_type) {
        conditions.push('d.mime_type LIKE ?');
        params.push(`${filters.mime_type}%`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY d.uploaded_at DESC';

      return await executeQuery(query, params);
    } catch (error) {
      throw new Error(`Error obteniendo documentos: ${error.message}`);
    }
  }

  // Obtener documentos por usuario
  static async getByUser(userId) {
    try {
      const documents = await executeQuery(`
        SELECT 
          d.*,
          p.code as project_code,
          p.title as project_title
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE d.uploaded_by = ?
        ORDER BY d.uploaded_at DESC
      `, [userId]);
      
      return documents;
    } catch (error) {
      throw new Error(`Error obteniendo documentos del usuario: ${error.message}`);
    }
  }

  // Eliminar documento
  static async delete(id) {
    try {
      // Obtener información del archivo antes de eliminarlo
      const document = await this.findById(id);
      if (!document) {
        throw new Error('Documento no encontrado');
      }

      // Eliminar registro de la base de datos
      const result = await executeQuery('DELETE FROM documents WHERE id = ?', [id]);
      
      if (result.affectedRows > 0) {
        // Intentar eliminar el archivo físico
        try {
          await fs.unlink(document.file_path);
          console.log(`Archivo eliminado: ${document.file_path}`);
        } catch (fileError) {
          console.warn(`No se pudo eliminar el archivo físico: ${fileError.message}`);
          // No lanzar error, el registro ya se eliminó de la BD
        }
        return true;
      }
      
      return false;
    } catch (error) {
      throw new Error(`Error eliminando documento: ${error.message}`);
    }
  }

  // NUEVO: Verificar si existe un documento para un requerimiento específico
  static async existsForRequirement(projectId, stageName, requirementId) {
    try {
      const result = await getOne(
        'SELECT COUNT(*) as count FROM documents WHERE project_id = ? AND stage_name = ? AND requirement_id = ?',
        [projectId, stageName, requirementId]
      );
      return result.count > 0;
    } catch (error) {
      throw new Error(`Error verificando documentos: ${error.message}`);
    }
  }

  // Verificar si existe un documento para una etapa específica (legacy)
  static async existsForStage(projectId, stageName) {
    try {
      const result = await getOne(
        'SELECT COUNT(*) as count FROM documents WHERE project_id = ? AND stage_name = ?',
        [projectId, stageName]
      );
      return result.count > 0;
    } catch (error) {
      throw new Error(`Error verificando documentos: ${error.message}`);
    }
  }

  // NUEVO: Obtener estadísticas de requerimientos completados por etapa
  static async getRequirementStats(projectId, stageName) {
    try {
      const stats = await executeQuery(`
        SELECT 
          requirement_id,
          COUNT(*) as document_count,
          MAX(uploaded_at) as last_upload
        FROM documents 
        WHERE project_id = ? AND stage_name = ?
        GROUP BY requirement_id
      `, [projectId, stageName]);
      
      return stats;
    } catch (error) {
      throw new Error(`Error obteniendo estadísticas de requerimientos: ${error.message}`);
    }
  }

  // Obtener estadísticas de documentos
  static async getStats() {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total_documents,
          COUNT(DISTINCT project_id) as projects_with_documents,
          COUNT(DISTINCT uploaded_by) as users_with_uploads,
          SUM(file_size) as total_size_bytes,
          AVG(file_size) as avg_file_size,
          stage_name,
          COUNT(*) as documents_per_stage
        FROM documents
        GROUP BY stage_name
        WITH ROLLUP
      `);
      
      // Estadísticas por tipo de archivo
      const typeStats = await executeQuery(`
        SELECT 
          SUBSTRING_INDEX(mime_type, '/', 1) as file_type,
          COUNT(*) as count,
          SUM(file_size) as total_size
        FROM documents
        GROUP BY SUBSTRING_INDEX(mime_type, '/', 1)
        ORDER BY count DESC
      `);

      // NUEVO: Estadísticas por requerimiento
      const requirementStats = await executeQuery(`
        SELECT 
          stage_name,
          requirement_id,
          COUNT(*) as document_count,
          COUNT(DISTINCT project_id) as projects_count
        FROM documents
        WHERE requirement_id IS NOT NULL
        GROUP BY stage_name, requirement_id
        ORDER BY stage_name, requirement_id
      `);

      return {
        general: stats,
        by_type: typeStats,
        by_requirement: requirementStats
      };
    } catch (error) {
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }
  }

  // Buscar documentos por nombre
  static async searchByName(searchTerm) {
    try {
      const documents = await executeQuery(`
        SELECT 
          d.*,
          u.full_name as uploaded_by_name,
          p.code as project_code,
          p.title as project_title
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        JOIN projects p ON d.project_id = p.id
        WHERE d.original_name LIKE ? OR d.file_name LIKE ?
        ORDER BY d.uploaded_at DESC
      `, [`%${searchTerm}%`, `%${searchTerm}%`]);
      
      return documents;
    } catch (error) {
      throw new Error(`Error buscando documentos: ${error.message}`);
    }
  }

  // Actualizar información del documento (no el archivo)
  static async updateInfo(id, updateData) {
    try {
      const { original_name } = updateData;
      
      await executeQuery(
        'UPDATE documents SET original_name = ? WHERE id = ?',
        [original_name, id]
      );

      return await this.findById(id);
    } catch (error) {
      throw new Error(`Error actualizando documento: ${error.message}`);
    }
  }

  // Verificar acceso al documento
  static async canUserAccess(documentId, userId, userRole) {
    try {
      const document = await getOne(`
        SELECT d.*, p.user_id as project_owner
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE d.id = ?
      `, [documentId]);

      if (!document) {
        return { canAccess: false, reason: 'Documento no encontrado' };
      }

      // Admin puede acceder a todo
      if (userRole === 'admin') {
        return { canAccess: true, document };
      }

      // Usuario puede acceder si es el dueño del proyecto o subió el documento
      if (document.project_owner === userId || document.uploaded_by === userId) {
        return { canAccess: true, document };
      }

      return { canAccess: false, reason: 'Sin permisos para acceder a este documento' };
    } catch (error) {
      throw new Error(`Error verificando acceso: ${error.message}`);
    }
  }
}

module.exports = Document;