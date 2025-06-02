// backend/controllers/requirementController.js
const { executeQuery, getOne } = require('../config/database');
const emailService = require('../services/emailService');

class RequirementController {

  // Obtener validaciones de requerimientos para un proyecto
  static async getProjectRequirements(req, res) {
    try {
      const { project_id } = req.params;
      const { stage_name } = req.query;

      // Verificar permisos
      const project = await getOne('SELECT * FROM projects WHERE id = ?', [project_id]);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      if (req.user.role !== 'admin' && project.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este proyecto'
        });
      }

      let query = `
        SELECT 
          rv.*,
          CASE WHEN d.id IS NOT NULL THEN TRUE ELSE FALSE END as has_current_document,
          d.original_name as current_document_name,
          d.uploaded_at as current_document_date,
          COUNT(dall.id) as total_documents,
          u.full_name as reviewed_by_name
        FROM requirement_validations rv
        LEFT JOIN documents d ON rv.project_id = d.project_id 
          AND rv.stage_name = d.stage_name 
          AND rv.requirement_id = d.requirement_id 
          AND d.is_current = TRUE
        LEFT JOIN documents dall ON rv.project_id = dall.project_id 
          AND rv.stage_name = dall.stage_name 
          AND rv.requirement_id = dall.requirement_id
        LEFT JOIN users u ON rv.reviewed_by = u.id
        WHERE rv.project_id = ?
      `;

      const params = [project_id];

      if (stage_name) {
        query += ' AND rv.stage_name = ?';
        params.push(stage_name);
      }

      query += ` 
        GROUP BY rv.id 
        ORDER BY 
          CASE rv.stage_name 
            WHEN 'formalization' THEN 1
            WHEN 'design' THEN 2
            WHEN 'delivery' THEN 3
            WHEN 'operation' THEN 4
            WHEN 'maintenance' THEN 5
          END,
          rv.requirement_id
      `;

      const requirements = await executeQuery(query, params);

      res.json({
        success: true,
        data: {
          requirements,
          project: {
            id: project.id,
            code: project.code,
            title: project.title,
            user_name: project.user_name || 'Usuario'
          },
          total: requirements.length
        }
      });

    } catch (error) {
      console.error('Error obteniendo requerimientos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar estado de un requerimiento específico (solo admin)
  static async updateRequirementStatus(req, res) {
    try {
      const { project_id, stage_name, requirement_id } = req.params;
      const { status, admin_comments } = req.body;

      // Validar estado
      const validStatuses = ['pending', 'in-review', 'approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido'
        });
      }

      // Verificar que el requerimiento existe
      const requirement = await getOne(`
        SELECT rv.*, p.user_id, p.code, p.title, u.full_name as user_name, u.email as user_email
        FROM requirement_validations rv
        JOIN projects p ON rv.project_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE rv.project_id = ? AND rv.stage_name = ? AND rv.requirement_id = ?
      `, [project_id, stage_name, requirement_id]);

      if (!requirement) {
        return res.status(404).json({
          success: false,
          message: 'Requerimiento no encontrado'
        });
      }

      // Si se rechaza, verificar que hay comentarios
      if (status === 'rejected' && (!admin_comments || admin_comments.trim() === '')) {
        return res.status(400).json({
          success: false,
          message: 'Los comentarios son obligatorios para rechazar un requerimiento'
        });
      }

      // Actualizar estado del requerimiento
      await executeQuery(`
        UPDATE requirement_validations 
        SET status = ?, admin_comments = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE project_id = ? AND stage_name = ? AND requirement_id = ?
      `, [status, admin_comments, req.user.id, project_id, stage_name, requirement_id]);

      // Verificar si todos los requerimientos de la etapa están aprobados
      await this.checkAndUpdateStageStatus(project_id, stage_name);

      // Enviar notificación por email
      if (requirement.user_email) {
        try {
          const stageNames = {
            'formalization': 'Formalización',
            'design': 'Diseño y Validación',
            'delivery': 'Entrega y Configuración',
            'operation': 'Aceptación Operacional',
            'maintenance': 'Operación y Mantenimiento'
          };

          if (status === 'approved') {
            await emailService.notifyRequirementApproved(
              requirement.user_email,
              requirement.user_name,
              requirement.code,
              requirement.title,
              stageNames[stage_name] || stage_name,
              requirement.requirement_name,
              admin_comments || `Requerimiento ${requirement.requirement_name} aprobado exitosamente`
            );
          } else if (status === 'rejected') {
            await emailService.notifyRequirementRejected(
              requirement.user_email,
              requirement.user_name,
              requirement.code,
              requirement.title,
              stageNames[stage_name] || stage_name,
              requirement.requirement_name,
              admin_comments
            );
          }
        } catch (emailError) {
          console.error('Error enviando notificación:', emailError);
        }
      }

      res.json({
        success: true,
        message: `Requerimiento ${status === 'approved' ? 'aprobado' : status === 'rejected' ? 'rechazado' : 'actualizado'} exitosamente`
      });

    } catch (error) {
      console.error('Error actualizando requerimiento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Aprobar todos los requerimientos de una etapa (solo admin)
  static async approveStageRequirements(req, res) {
    try {
      const { project_id, stage_name } = req.params;
      const { admin_comments } = req.body;

      // Verificar que la etapa existe
      const stage = await getOne(`
        SELECT ps.*, p.user_id, p.code, p.title, u.full_name as user_name, u.email as user_email
        FROM project_stages ps
        JOIN projects p ON ps.project_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE ps.project_id = ? AND ps.stage_name = ?
      `, [project_id, stage_name]);

      if (!stage) {
        return res.status(404).json({
          success: false,
          message: 'Etapa no encontrada'
        });
      }

      // Aprobar todos los requerimientos de la etapa que tengan documentos
      const updateResult = await executeQuery(`
        UPDATE requirement_validations rv
        SET status = 'approved', 
            admin_comments = COALESCE(?, admin_comments), 
            reviewed_by = ?, 
            reviewed_at = CURRENT_TIMESTAMP
        WHERE rv.project_id = ? 
          AND rv.stage_name = ?
          AND EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.project_id = rv.project_id 
              AND d.stage_name = rv.stage_name 
              AND d.requirement_id = rv.requirement_id 
              AND d.is_current = TRUE
          )
      `, [admin_comments, req.user.id, project_id, stage_name]);

      if (updateResult.affectedRows === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay requerimientos con documentos para aprobar en esta etapa'
        });
      }

      // Actualizar estado de la etapa
      await this.checkAndUpdateStageStatus(project_id, stage_name);

      // Enviar notificación por email
      if (stage.user_email) {
        try {
          const stageNames = {
            'formalization': 'Formalización',
            'design': 'Diseño y Validación',
            'delivery': 'Entrega y Configuración',
            'operation': 'Aceptación Operacional',
            'maintenance': 'Operación y Mantenimiento'
          };

          await emailService.notifyStageApproved(
            stage.user_email,
            stage.user_name,
            stage.code,
            stage.title,
            stageNames[stage_name] || stage_name,
            admin_comments || `Todos los requerimientos de la etapa ${stageNames[stage_name]} han sido aprobados`
          );
        } catch (emailError) {
          console.error('Error enviando notificación:', emailError);
        }
      }

      res.json({
        success: true,
        message: `${updateResult.affectedRows} requerimientos de la etapa aprobados exitosamente`
      });

    } catch (error) {
      console.error('Error aprobando etapa:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener historial de documentos para un requerimiento
  static async getRequirementDocumentHistory(req, res) {
    try {
      const { project_id, stage_name, requirement_id } = req.params;

      // Verificar permisos
      const project = await getOne('SELECT * FROM projects WHERE id = ?', [project_id]);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      if (req.user.role !== 'admin' && project.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este proyecto'
        });
      }

      // Para usuarios normales, solo mostrar el documento actual
      let query;
      if (req.user.role === 'admin') {
        // Admin ve todo el historial
        query = `
          SELECT 
            d.*,
            u.full_name as uploaded_by_name,
            u.username as uploaded_by_username
          FROM documents d
          JOIN users u ON d.uploaded_by = u.id
          WHERE d.project_id = ? AND d.stage_name = ? AND d.requirement_id = ?
          ORDER BY d.version DESC, d.uploaded_at DESC
        `;
      } else {
        // Usuario solo ve el documento actual
        query = `
          SELECT 
            d.*,
            u.full_name as uploaded_by_name,
            u.username as uploaded_by_username
          FROM documents d
          JOIN users u ON d.uploaded_by = u.id
          WHERE d.project_id = ? AND d.stage_name = ? AND d.requirement_id = ? AND d.is_current = TRUE
          ORDER BY d.uploaded_at DESC
        `;
      }

      const documents = await executeQuery(query, [project_id, stage_name, requirement_id]);

      // Obtener información del requerimiento
      const requirement = await getOne(`
        SELECT * FROM requirement_validations 
        WHERE project_id = ? AND stage_name = ? AND requirement_id = ?
      `, [project_id, stage_name, requirement_id]);

      res.json({
        success: true,
        data: {
          documents,
          requirement,
          show_history: req.user.role === 'admin',
          total_versions: documents.length
        }
      });

    } catch (error) {
      console.error('Error obteniendo historial de documentos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Generar informe final del proyecto
  static async generateFinalReport(req, res) {
    try {
      const { project_id } = req.params;

      // Verificar que el proyecto existe
      const project = await getOne(`
        SELECT p.*, u.full_name as user_name, u.email as user_email
        FROM projects p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `, [project_id]);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      // Verificar si todas las etapas están completadas
      const incompleteStages = await executeQuery(`
        SELECT stage_name 
        FROM project_stages 
        WHERE project_id = ? AND status != 'completed'
      `, [project_id]);

      if (incompleteStages.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede generar el informe final. Hay etapas incompletas.',
          incomplete_stages: incompleteStages.map(s => s.stage_name)
        });
      }

      // Generar datos del informe
      const reportData = await this.generateReportData(project_id);

      // Insertar informe en la base de datos
      const reportId = await executeQuery(`
        INSERT INTO project_reports (project_id, generated_by, report_data)
        VALUES (?, ?, ?)
      `, [project_id, req.user.id, JSON.stringify(reportData)]);

      // Marcar proyecto como con informe generado
      await executeQuery('UPDATE projects SET final_report_generated = TRUE WHERE id = ?', [project_id]);

      res.json({
        success: true,
        message: 'Informe final generado exitosamente',
        data: {
          report_id: reportId.insertId,
          project_code: project.code,
          generated_at: new Date().toISOString(),
          report_data: reportData
        }
      });

    } catch (error) {
      console.error('Error generando informe final:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener estadísticas de requerimientos
  static async getRequirementStats(req, res) {
    try {
      const { project_id } = req.params;

      // Verificar que el proyecto existe
      const project = await getOne('SELECT * FROM projects WHERE id = ?', [project_id]);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      // Verificar permisos
      if (req.user.role !== 'admin' && project.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este proyecto'
        });
      }

      const stats = await executeQuery(`
        SELECT 
          stage_name,
          COUNT(*) as total_requirements,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN status = 'in-review' THEN 1 ELSE 0 END) as in_review,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          ROUND((SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as completion_percentage
        FROM requirement_validations 
        WHERE project_id = ?
        GROUP BY stage_name
        ORDER BY 
          CASE stage_name 
            WHEN 'formalization' THEN 1
            WHEN 'design' THEN 2
            WHEN 'delivery' THEN 3
            WHEN 'operation' THEN 4
            WHEN 'maintenance' THEN 5
          END
      `, [project_id]);

      // Estadísticas generales
      const generalStats = await getOne(`
        SELECT 
          COUNT(*) as total_requirements,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as total_approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as total_rejected,
          SUM(CASE WHEN status = 'in-review' THEN 1 ELSE 0 END) as total_in_review,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as total_pending,
          ROUND((SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as overall_completion
        FROM requirement_validations 
        WHERE project_id = ?
      `, [project_id]);

      res.json({
        success: true,
        data: { 
          stats,
          general: generalStats,
          project: {
            id: project.id,
            code: project.code,
            title: project.title
          }
        }
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // MÉTODOS AUXILIARES

  // Verificar y actualizar estado de etapa basado en requerimientos
  static async checkAndUpdateStageStatus(projectId, stageName) {
    try {
      // Contar requerimientos totales y aprobados
      const stats = await getOne(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
        FROM requirement_validations 
        WHERE project_id = ? AND stage_name = ?
      `, [projectId, stageName]);

      // Si todos los requerimientos están aprobados, completar la etapa
      if (stats.total === stats.approved && stats.total > 0) {
        await executeQuery(`
          UPDATE project_stages 
          SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
          WHERE project_id = ? AND stage_name = ?
        `, [projectId, stageName]);

        // Actualizar current_stage del proyecto
        await this.updateProjectCurrentStage(projectId);
      }
    } catch (error) {
      console.error('Error actualizando estado de etapa:', error);
    }
  }

  // Actualizar current_stage del proyecto
  static async updateProjectCurrentStage(projectId) {
    try {
      const stages = ['formalization', 'design', 'delivery', 'operation', 'maintenance'];
      
      // Encontrar la primera etapa no completada
      let nextStage = null;
      for (const stage of stages) {
        const stageData = await getOne(`
          SELECT status FROM project_stages 
          WHERE project_id = ? AND stage_name = ?
        `, [projectId, stage]);

        if (!stageData || stageData.status !== 'completed') {
          nextStage = stage;
          break;
        }
      }

      // Si todas las etapas están completadas
      if (!nextStage) {
        await executeQuery(`
          UPDATE projects 
          SET current_stage = 'maintenance', status = 'approved'
          WHERE id = ?
        `, [projectId]);
      } else {
        await executeQuery(`
          UPDATE projects 
          SET current_stage = ?
          WHERE id = ?
        `, [nextStage, projectId]);
      }
    } catch (error) {
      console.error('Error actualizando current_stage:', error);
    }
  }

  // Generar datos del informe
  static async generateReportData(projectId) {
    try {
      // Información del proyecto
      const project = await getOne(`
        SELECT p.*, u.full_name as user_name, u.email as user_email
        FROM projects p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `, [projectId]);

      // Etapas del proyecto
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

      // Requerimientos con documentos
      const requirements = await executeQuery(`
        SELECT 
          rv.*,
          COUNT(d.id) as document_count,
          GROUP_CONCAT(d.original_name SEPARATOR ', ') as document_names
        FROM requirement_validations rv
        LEFT JOIN documents d ON rv.project_id = d.project_id 
          AND rv.stage_name = d.stage_name 
          AND rv.requirement_id = d.requirement_id
        WHERE rv.project_id = ?
        GROUP BY rv.id
        ORDER BY 
          CASE rv.stage_name 
            WHEN 'formalization' THEN 1
            WHEN 'design' THEN 2
            WHEN 'delivery' THEN 3
            WHEN 'operation' THEN 4
            WHEN 'maintenance' THEN 5
          END,
          rv.requirement_id
      `, [projectId]);

      return {
        project: {
          id: project.id,
          code: project.code,
          title: project.title,
          description: project.description,
          user_name: project.user_name,
          user_email: project.user_email,
          created_at: project.created_at,
          updated_at: project.updated_at,
          status: project.status
        },
        stages: stages.map(stage => ({
          stage_name: stage.stage_name,
          status: stage.status,
          admin_comments: stage.admin_comments,
          completed_at: stage.completed_at,
          requirements: requirements.filter(req => req.stage_name === stage.stage_name)
        })),
        summary: {
          total_requirements: requirements.length,
          approved_requirements: requirements.filter(req => req.status === 'approved').length,
          rejected_requirements: requirements.filter(req => req.status === 'rejected').length,
          total_documents: requirements.reduce((sum, req) => sum + req.document_count, 0),
          completion_percentage: Math.round((requirements.filter(req => req.status === 'approved').length / requirements.length) * 100)
        },
        generated_at: new Date().toISOString(),
        generated_by: 'System'
      };
    } catch (error) {
      console.error('Error generando datos del informe:', error);
      throw error;
    }
  }
}

module.exports = RequirementController;