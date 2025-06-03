// backend/models/Document.js - CON LÓGICA DE TRIGGERS INTEGRADA
const { executeQuery, getOne, insertAndGetId } = require('../config/database');
const path = require('path');
const fs = require('fs').promises;

class Document {

  // Crear nuevo documento con lógica de triggers integrada
  static async create(documentData) {
    try {
      const { 
        project_id, 
        stage_name, 
        requirement_id,
        file_name, 
        original_name, 
        file_path, 
        file_size, 
        mime_type, 
        uploaded_by 
      } = documentData;

      console.log('📝 Creando documento con datos:', {
        project_id,
        stage_name,
        requirement_id,
        file_name: file_name.substring(0, 20) + '...',
        original_name
      });

      // PASO 1: Marcar documentos anteriores como no actuales (lógica del primer trigger)
      await this.markPreviousDocumentsAsOld(project_id, stage_name, requirement_id);

      // PASO 2: Insertar el nuevo documento
      const documentId = await insertAndGetId(`
        INSERT INTO documents 
        (project_id, stage_name, requirement_id, file_name, original_name, file_path, file_size, mime_type, uploaded_by, is_current) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
      `, [project_id, stage_name, requirement_id, file_name, original_name, file_path, file_size, mime_type, uploaded_by]);

      console.log('✅ Documento creado con ID:', documentId);

      // PASO 3: Actualizar estado del requerimiento (lógica del segundo trigger)
      await this.updateRequirementStatus(project_id, stage_name, requirement_id);

      // PASO 4: Obtener el documento completo
      return await this.findById(documentId);

    } catch (error) {
      console.error('❌ Error creando documento:', error);
      throw new Error(`Error creando documento: ${error.message}`);
    }
  }

  // 🔄 LÓGICA DEL PRIMER TRIGGER: Marcar documentos anteriores como no actuales
  static async markPreviousDocumentsAsOld(projectId, stageName, requirementId) {
    try {
      console.log('🔄 Marcando documentos anteriores como no actuales...');
      
      const result = await executeQuery(`
        UPDATE documents 
        SET is_current = FALSE 
        WHERE project_id = ? 
          AND stage_name = ? 
          AND requirement_id = ? 
          AND is_current = TRUE
      `, [projectId, stageName, requirementId]);

      console.log(`✅ ${result.affectedRows} documentos anteriores marcados como no actuales`);
    } catch (error) {
      console.error('❌ Error marcando documentos anteriores:', error);
      // No lanzar error aquí para no bloquear el upload
    }
  }

  // 🔄 LÓGICA DEL SEGUNDO TRIGGER: Actualizar estado del requerimiento
  static async updateRequirementStatus(projectId, stageName, requirementId) {
    try {
      console.log('🔄 Actualizando estado del requerimiento...');
      
      // Verificar si existe una tabla de validaciones de requerimientos
      const tableExists = await executeQuery(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
          AND table_name = 'requirement_validations'
      `);

      if (tableExists[0].count > 0) {
        // Si existe la tabla, actualizar el estado
        const updateResult = await executeQuery(`
          INSERT INTO requirement_validations 
          (project_id, stage_name, requirement_id, status, updated_at)
          VALUES (?, ?, ?, 'in-review', NOW())
          ON DUPLICATE KEY UPDATE 
            status = CASE 
              WHEN status = 'rejected' THEN 'in-review'
              WHEN status = 'pending' THEN 'in-review'
              ELSE status 
            END,
            updated_at = NOW()
        `, [projectId, stageName, requirementId]);

        console.log('✅ Estado del requerimiento actualizado');
      } else {
        console.log('ℹ️ Tabla requirement_validations no existe, saltando actualización');
      }

      // También actualizar el estado de la etapa en project_stages
      await executeQuery(`
        UPDATE project_stages 
        SET status = CASE 
          WHEN status = 'rejected' THEN 'in-progress'
          WHEN status = 'pending' THEN 'in-progress'
          ELSE status 
        END
        WHERE project_id = ? AND stage_name = ?
      `, [projectId, stageName]);

      console.log('✅ Estado de la etapa actualizado si era necesario');

    } catch (error) {
      console.error('❌ Error actualizando estado del requerimiento:', error);
      // No lanzar error aquí para no bloquear el upload
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

  // Obtener documentos por proyecto (solo actuales por defecto)
  static async getByProject(projectId, includeOld = false) {
    try {
      let query = `
        SELECT 
          d.*,
          u.full_name as uploaded_by_name,
          u.username as uploaded_by_username
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        WHERE d.project_id = ?
      `;

      // Si no se incluyen documentos antiguos, filtrar solo los actuales
      if (!includeOld) {
        query += ` AND (d.is_current = TRUE OR d.is_current IS NULL)`;
      }

      query += ` ORDER BY d.stage_name, d.requirement_id, d.uploaded_at DESC`;

      const documents = await executeQuery(query, [projectId]);
      return documents;
    } catch (error) {
      throw new Error(`Error obteniendo documentos del proyecto: ${error.message}`);
    }
  }

  // Obtener documentos por proyecto y etapa
  static async getByProjectAndStage(projectId, stageName, includeOld = false) {
    try {
      let query = `
        SELECT 
          d.*,
          u.full_name as uploaded_by_name,
          u.username as uploaded_by_username
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        WHERE d.project_id = ? AND d.stage_name = ?
      `;

      if (!includeOld) {
        query += ` AND (d.is_current = TRUE OR d.is_current IS NULL)`;
      }

      query += ` ORDER BY d.requirement_id, d.uploaded_at DESC`;

      const documents = await executeQuery(query, [projectId, stageName]);
      return documents;
    } catch (error) {
      throw new Error(`Error obteniendo documentos de la etapa: ${error.message}`);
    }
  }

  // Obtener documento actual por requerimiento específico
  static async getByRequirement(projectId, stageName, requirementId) {
    try {
      const document = await getOne(`
        SELECT 
          d.*,
          u.full_name as uploaded_by_name,
          u.username as uploaded_by_username
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        WHERE d.project_id = ? 
          AND d.stage_name = ? 
          AND d.requirement_id = ?
          AND (d.is_current = TRUE OR d.is_current IS NULL)
        ORDER BY d.uploaded_at DESC
        LIMIT 1
      `, [projectId, stageName, requirementId]);
      
      return document;
    } catch (error) {
      throw new Error(`Error obteniendo documento del requerimiento: ${error.message}`);
    }
  }

  // Obtener historial completo de documentos por requerimiento
  static async getAllByRequirement(projectId, stageName, requirementId) {
    try {
      const documents = await executeQuery(`
        SELECT 
          d.*,
          u.full_name as uploaded_by_name,
          u.username as uploaded_by_username,
          CASE WHEN d.is_current = TRUE THEN 'Actual' ELSE 'Histórico' END as version_status
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

  // Resto de métodos sin cambios importantes...
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

      // Por defecto, solo mostrar documentos actuales
      if (!filters.include_old) {
        conditions.push('(d.is_current = TRUE OR d.is_current IS NULL)');
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
          AND (d.is_current = TRUE OR d.is_current IS NULL)
        ORDER BY d.uploaded_at DESC
      `, [userId]);
      
      return documents;
    } catch (error) {
      throw new Error(`Error obteniendo documentos del usuario: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const document = await this.findById(id);
      if (!document) {
        throw new Error('Documento no encontrado');
      }

      const result = await executeQuery('DELETE FROM documents WHERE id = ?', [id]);
      
      if (result.affectedRows > 0) {
        try {
          await fs.unlink(document.file_path);
          console.log(`Archivo eliminado: ${document.file_path}`);
        } catch (fileError) {
          console.warn(`No se pudo eliminar el archivo físico: ${fileError.message}`);
        }
        return true;
      }
      
      return false;
    } catch (error) {
      throw new Error(`Error eliminando documento: ${error.message}`);
    }
  }

  static async existsForRequirement(projectId, stageName, requirementId) {
    try {
      const result = await getOne(
        `SELECT COUNT(*) as count 
         FROM documents 
         WHERE project_id = ? 
           AND stage_name = ? 
           AND requirement_id = ?
           AND (is_current = TRUE OR is_current IS NULL)`,
        [projectId, stageName, requirementId]
      );
      return result.count > 0;
    } catch (error) {
      throw new Error(`Error verificando documentos: ${error.message}`);
    }
  }

  static async existsForStage(projectId, stageName) {
    try {
      const result = await getOne(
        `SELECT COUNT(*) as count 
         FROM documents 
         WHERE project_id = ? 
           AND stage_name = ?
           AND (is_current = TRUE OR is_current IS NULL)`,
        [projectId, stageName]
      );
      return result.count > 0;
    } catch (error) {
      throw new Error(`Error verificando documentos: ${error.message}`);
    }
  }

  static async getRequirementStats(projectId, stageName) {
    try {
      const stats = await executeQuery(`
        SELECT 
          requirement_id,
          COUNT(*) as document_count,
          MAX(uploaded_at) as last_upload,
          SUM(CASE WHEN is_current = TRUE THEN 1 ELSE 0 END) as current_documents
        FROM documents 
        WHERE project_id = ? AND stage_name = ?
        GROUP BY requirement_id
      `, [projectId, stageName]);
      
      return stats;
    } catch (error) {
      throw new Error(`Error obteniendo estadísticas de requerimientos: ${error.message}`);
    }
  }

  // Resto de métodos sin cambios...
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
        WHERE (is_current = TRUE OR is_current IS NULL)
        GROUP BY stage_name
        WITH ROLLUP
      `);
      
      const typeStats = await executeQuery(`
        SELECT 
          SUBSTRING_INDEX(mime_type, '/', 1) as file_type,
          COUNT(*) as count,
          SUM(file_size) as total_size
        FROM documents
        WHERE (is_current = TRUE OR is_current IS NULL)
        GROUP BY SUBSTRING_INDEX(mime_type, '/', 1)
        ORDER BY count DESC
      `);

      const requirementStats = await executeQuery(`
        SELECT 
          stage_name,
          requirement_id,
          COUNT(*) as document_count,
          COUNT(DISTINCT project_id) as projects_count
        FROM documents
        WHERE requirement_id IS NOT NULL
          AND (is_current = TRUE OR is_current IS NULL)
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
        WHERE (d.original_name LIKE ? OR d.file_name LIKE ?)
          AND (d.is_current = TRUE OR d.is_current IS NULL)
        ORDER BY d.uploaded_at DESC
      `, [`%${searchTerm}%`, `%${searchTerm}%`]);
      
      return documents;
    } catch (error) {
      throw new Error(`Error buscando documentos: ${error.message}`);
    }
  }

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

      if (userRole === 'admin') {
        return { canAccess: true, document };
      }

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