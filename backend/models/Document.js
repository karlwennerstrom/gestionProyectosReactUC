// backend/models/Document.js - VERSIÓN BÁSICA COMPATIBLE
const { executeQuery, getOne, insertAndGetId } = require('../config/database');
const path = require('path');
const fs = require('fs').promises;

class Document {

  // Crear nuevo documento usando solo columnas básicas
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

      console.log('📝 Creando documento con datos básicos:', {
        project_id,
        stage_name,
        requirement_id,
        file_name: file_name ? file_name.substring(0, 20) + '...' : 'undefined',
        original_name
      });

      // Validar campos requeridos
      if (!project_id || !stage_name || !requirement_id || !file_name || !original_name || !file_path || !file_size || !mime_type || !uploaded_by) {
        throw new Error('Faltan campos requeridos para crear el documento');
      }

      // PASO 1: Verificar si existe is_current column
      let hasIsCurrentColumn = false;
      try {
        const columns = await executeQuery(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'documents' 
            AND COLUMN_NAME = 'is_current'
        `);
        hasIsCurrentColumn = columns.length > 0;
        console.log('🔍 Columna is_current existe:', hasIsCurrentColumn);
      } catch (error) {
        console.warn('No se pudo verificar columna is_current:', error.message);
      }

      // PASO 2: Marcar documentos anteriores como no actuales (si la columna existe)
      if (hasIsCurrentColumn) {
        await executeQuery(`
          UPDATE documents 
          SET is_current = FALSE 
          WHERE project_id = ? 
            AND stage_name = ? 
            AND requirement_id = ? 
            AND is_current = TRUE
        `, [project_id, stage_name, requirement_id]);
        console.log('🔄 Documentos anteriores marcados como no actuales');
      }

      // PASO 3: Insertar nuevo documento con columnas básicas
      let insertQuery, insertParams;
      
      if (hasIsCurrentColumn) {
        insertQuery = `
          INSERT INTO documents 
          (project_id, stage_name, requirement_id, file_name, original_name, file_path, file_size, mime_type, uploaded_by, is_current) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        `;
        insertParams = [project_id, stage_name, requirement_id, file_name, original_name, file_path, file_size, mime_type, uploaded_by];
      } else {
        insertQuery = `
          INSERT INTO documents 
          (project_id, stage_name, requirement_id, file_name, original_name, file_path, file_size, mime_type, uploaded_by) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        insertParams = [project_id, stage_name, requirement_id, file_name, original_name, file_path, file_size, mime_type, uploaded_by];
      }

      const documentId = await insertAndGetId(insertQuery, insertParams);
      console.log('✅ Documento creado con ID:', documentId);

      // PASO 4: Actualizar estado del requerimiento (opcional)
      await this.updateRequirementStatus(project_id, stage_name, requirement_id);

      // PASO 5: Obtener el documento completo
      return await this.findById(documentId);

    } catch (error) {
      console.error('❌ Error creando documento:', error);
      throw new Error(`Error creando documento: ${error.message}`);
    }
  }

  // Función para actualizar estado del requerimiento
  static async updateRequirementStatus(projectId, stageName, requirementId) {
    try {
      // Verificar si existe la tabla requirement_validations
      const tableExists = await executeQuery(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
          AND table_name = 'requirement_validations'
      `);

      if (tableExists[0].count > 0) {
        await executeQuery(`
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
      }
    } catch (error) {
      console.warn('⚠️ No se pudo actualizar estado del requerimiento:', error.message);
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

      // Solo filtrar por is_current si la columna existe
      if (!includeOld) {
        // Verificar si existe la columna is_current
        try {
          const columns = await executeQuery(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'documents' 
              AND COLUMN_NAME = 'is_current'
          `);
          if (columns.length > 0) {
            query += ` AND (d.is_current = TRUE OR d.is_current IS NULL)`;
          }
        } catch (error) {
          console.warn('No se pudo verificar columna is_current para filtrado');
        }
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
        try {
          const columns = await executeQuery(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'documents' 
              AND COLUMN_NAME = 'is_current'
          `);
          if (columns.length > 0) {
            query += ` AND (d.is_current = TRUE OR d.is_current IS NULL)`;
          }
        } catch (error) {
          console.warn('No se pudo verificar columna is_current');
        }
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
      let query = `
        SELECT 
          d.*,
          u.full_name as uploaded_by_name,
          u.username as uploaded_by_username
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        WHERE d.project_id = ? 
          AND d.stage_name = ? 
          AND d.requirement_id = ?
      `;

      // Agregar filtro is_current si la columna existe
      try {
        const columns = await executeQuery(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'documents' 
            AND COLUMN_NAME = 'is_current'
        `);
        if (columns.length > 0) {
          query += ` AND (d.is_current = TRUE OR d.is_current IS NULL)`;
        }
      } catch (error) {
        console.warn('No se pudo verificar columna is_current');
      }

      query += ` ORDER BY d.uploaded_at DESC LIMIT 1`;

      const document = await getOne(query, [projectId, stageName, requirementId]);
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

  // Resto de métodos básicos...
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

  // Métodos adicionales simplificados
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT 
          d.*,
          u.full_name as uploaded_by_name,
          p.code as project_code,
          p.title as project_title
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        JOIN projects p ON d.project_id = p.id
        WHERE 1=1
      `;
      
      const params = [];

      if (filters.project_id) {
        query += ' AND d.project_id = ?';
        params.push(filters.project_id);
      }

      if (filters.stage_name) {
        query += ' AND d.stage_name = ?';
        params.push(filters.stage_name);
      }

      if (filters.requirement_id) {
        query += ' AND d.requirement_id = ?';
        params.push(filters.requirement_id);
      }

      query += ' ORDER BY d.uploaded_at DESC';

      return await executeQuery(query, params);
    } catch (error) {
      throw new Error(`Error obteniendo documentos: ${error.message}`);
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
        ORDER BY d.uploaded_at DESC
      `, [`%${searchTerm}%`, `%${searchTerm}%`]);
      
      return documents;
    } catch (error) {
      throw new Error(`Error buscando documentos: ${error.message}`);
    }
  }

  static async getStats() {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total_documents,
          COUNT(DISTINCT project_id) as projects_with_documents,
          COUNT(DISTINCT uploaded_by) as users_with_uploads,
          SUM(file_size) as total_size_bytes
        FROM documents
      `);
      
      return { general: stats };
    } catch (error) {
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }
  }
}

module.exports = Document;