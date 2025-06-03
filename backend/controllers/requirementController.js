// backend/controllers/requirementController.js - ACTUALIZADO CON PERSISTENCIA
const Document = require('../models/Document');
const Project = require('../models/Project');
const { stageRequirements } = require('../config/stageRequirements');
const { executeQuery, getOne } = require('../config/database');

// ← FUNCIÓN PARA ASEGURAR QUE LA TABLA EXISTE
const ensureRequirementValidationsTable = async () => {
  try {
    // Verificar si existe la tabla requirement_validations
    const tableExists = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
        AND table_name = 'requirement_validations'
    `);

    if (tableExists[0].count === 0) {
      console.log('📝 Creando tabla requirement_validations...');
      
      await executeQuery(`
        CREATE TABLE requirement_validations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          project_id INT NOT NULL,
          stage_name VARCHAR(50) NOT NULL,
          requirement_id VARCHAR(100) NOT NULL,
          status ENUM('pending', 'in-review', 'approved', 'rejected') DEFAULT 'pending',
          admin_comments TEXT,
          reviewed_by INT,
          reviewed_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (reviewed_by) REFERENCES users(id),
          UNIQUE KEY unique_requirement (project_id, stage_name, requirement_id)
        )
      `);

      console.log('✅ Tabla requirement_validations creada exitosamente');
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error verificando/creando tabla requirement_validations:', error);
    return false;
  }
};

// ← FUNCIÓN MEJORADA PARA DETERMINAR ESTADO CON VALIDACIONES
function determineRequirementStatus(documents, currentDoc, validation) {
  // Si hay validación explícita del admin, usar esa
  if (validation && validation.status) {
    return validation.status;
  }
  
  // Si no hay documentos, está pendiente
  if (!currentDoc) {
    return 'pending';
  }
  
  // Si hay documentos pero no hay validación, está en revisión
  if (documents.length > 0) {
    return 'in-review';
  }
  
  return 'pending';
}

class RequirementController {
  
  // ← OBTENER REQUERIMIENTOS CON ESTADOS REALES DESDE LA BD
  static async getProjectRequirements(req, res) {
    try {
      const { project_id } = req.params;

      console.log(`📋 Cargando requerimientos para proyecto ${project_id}`);

      // Verificar que el proyecto existe
      const project = await Project.findById(project_id);
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
          message: 'No tienes permisos para ver los requerimientos de este proyecto'
        });
      }

      // ← ASEGURAR QUE LA TABLA EXISTE
      await ensureRequirementValidationsTable();

      // ← OBTENER VALIDACIONES PERSISTENTES
      const validations = await executeQuery(`
        SELECT * FROM requirement_validations 
        WHERE project_id = ?
        ORDER BY updated_at DESC
      `, [project_id]);

      console.log(`📊 Validaciones encontradas: ${validations.length}`);

      // Obtener todos los documentos del proyecto
      const documents = await Document.getByProject(project_id, true); // incluir históricos

      console.log(`📄 Documentos encontrados: ${documents.length}`);

      // ← CREAR ARRAY DE REQUERIMIENTOS CON ESTADOS REALES
      const requirements = [];

      // Iterar por cada etapa y requerimiento
      Object.entries(stageRequirements).forEach(([stageId, stage]) => {
        stage.requirements.forEach(requirement => {
          // Buscar documentos para este requerimiento específico
          const requirementDocs = documents.filter(doc => 
            doc.stage_name === stageId && 
            doc.requirement_id === requirement.id
          );

          // Documento actual (más reciente)
          const currentDoc = requirementDocs.find(doc => doc.is_current) || 
                           requirementDocs.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))[0];

          // ← BUSCAR VALIDACIÓN PERSISTENTE
          const validation = validations.find(v => 
            v.stage_name === stageId && 
            v.requirement_id === requirement.id
          );

          // ← DETERMINAR ESTADO REAL
          const status = determineRequirementStatus(requirementDocs, currentDoc, validation);

          // DEBUG: Ver qué documentos encuentra
          console.log(`🔍 Requerimiento ${requirement.id}:`, {
            requirementDocs: requirementDocs.length,
            currentDoc: currentDoc ? currentDoc.original_name : 'null',
            validation: validation ? validation.status : 'none',
            finalStatus: status,
            hasIsCurrentField: requirementDocs.length > 0 ? requirementDocs[0].hasOwnProperty('is_current') : 'no docs'
          });

          // ← CREAR OBJETO CON DATOS REALES
          const requirementData = {
            project_id: parseInt(project_id),
            stage_name: stageId,
            requirement_id: requirement.id,
            requirement_name: requirement.name,
            required: requirement.required || false,
            
            // ← ESTADO REAL DESDE LA BD
            status: status,
            
            // Información del documento actual
            has_current_document: !!currentDoc,
            current_document_name: currentDoc?.original_name || null,
            current_document_date: currentDoc?.uploaded_at || null,
            current_document_id: currentDoc?.id || null,
            
            // Historial
            total_documents: requirementDocs.length,
            document_history: requirementDocs.map(doc => ({
              id: doc.id,
              name: doc.original_name,
              uploaded_at: doc.uploaded_at,
              uploaded_by: doc.uploaded_by_name,
              is_current: doc.is_current || false,
              file_size: doc.file_size,
              mime_type: doc.mime_type
            })),
            
            // ← COMENTARIOS REALES DEL ADMIN
            admin_comments: validation?.admin_comments || null,
            reviewed_at: validation?.reviewed_at || null,
            reviewed_by: validation?.reviewed_by || null
          };

          requirements.push(requirementData);
        });
      });

      console.log(`✅ ${requirements.length} requerimientos procesados con estados reales`);

      res.json({
        success: true,
        data: {
          requirements,
          project: {
            id: project.id,
            code: project.code,
            title: project.title,
            user_name: project.user_name
          },
          total_requirements: requirements.length,
          completed_requirements: requirements.filter(req => req.status === 'approved').length
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo requerimientos del proyecto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ← ACTUALIZAR ESTADO DE REQUERIMIENTO - AHORA PERSISTENTE
  static async updateRequirementStatus(req, res) {
    try {
      const { project_id, stage_name, requirement_id } = req.params;
      const { status, admin_comments } = req.body;

      console.log(`🔄 Actualizando requerimiento ${requirement_id} a estado ${status}`);

      // Validar estado
      const validStatuses = ['pending', 'in-review', 'approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido. Debe ser: ' + validStatuses.join(', ')
        });
      }

      // Verificar que el proyecto existe
      const project = await Project.findById(project_id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      // ← ASEGURAR QUE LA TABLA EXISTE
      await ensureRequirementValidationsTable();

      // ← GUARDAR ESTADO REAL EN LA BASE DE DATOS
      await executeQuery(`
        INSERT INTO requirement_validations 
        (project_id, stage_name, requirement_id, status, admin_comments, reviewed_by, reviewed_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
          status = VALUES(status),
          admin_comments = VALUES(admin_comments),
          reviewed_by = VALUES(reviewed_by),
          reviewed_at = NOW(),
          updated_at = NOW()
      `, [project_id, stage_name, requirement_id, status, admin_comments, req.user.id]);

      console.log(`✅ Estado guardado en BD: ${status}`);

      // ← VERIFICAR SI TODOS LOS REQUERIMIENTOS DE LA ETAPA ESTÁN APROBADOS
      if (status === 'approved') {
        try {
          const stage = stageRequirements[stage_name];
          if (stage) {
            // Contar requerimientos aprobados en esta etapa
            const approvedCount = await executeQuery(`
              SELECT COUNT(*) as count 
              FROM requirement_validations 
              WHERE project_id = ? AND stage_name = ? AND status = 'approved'
            `, [project_id, stage_name]);

            const totalRequirements = stage.requirements.length;
            
            console.log(`📊 Etapa ${stage_name}: ${approvedCount[0].count}/${totalRequirements} aprobados`);

            // Si todos están aprobados, marcar la etapa como completada
            if (approvedCount[0].count === totalRequirements) {
              await Project.updateStage(
                project_id,
                stage_name,
                'completed',
                `Todos los ${totalRequirements} requerimientos aprobados`
              );
              console.log(`🎉 Etapa ${stage_name} marcada como completada`);
            }
          }
        } catch (stageError) {
          console.error('Error verificando completitud de etapa:', stageError);
        }
      }

      console.log(`✅ Requerimiento ${requirement_id} actualizado a ${status}`);

      res.json({
        success: true,
        message: `Requerimiento ${status === 'approved' ? 'aprobado' : 'rechazado'} exitosamente`,
        data: {
          project_id: parseInt(project_id),
          stage_name,
          requirement_id,
          status,
          admin_comments,
          reviewed_by: req.user.id,
          updated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error actualizando estado del requerimiento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // ← APROBAR TODOS LOS REQUERIMIENTOS DE UNA ETAPA - AHORA PERSISTENTE
  static async approveStageRequirements(req, res) {
    try {
      const { project_id, stage_name } = req.params;
      const { admin_comments } = req.body;

      console.log(`✅ Aprobando todos los requerimientos de etapa ${stage_name}`);

      // Verificar que el proyecto existe
      const project = await Project.findById(project_id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      // Verificar que la etapa existe
      if (!stageRequirements[stage_name]) {
        return res.status(400).json({
          success: false,
          message: 'Etapa no válida'
        });
      }

      // ← ASEGURAR QUE LA TABLA EXISTE
      await ensureRequirementValidationsTable();

      // Obtener todos los requerimientos de la etapa
      const stage = stageRequirements[stage_name];
      const approvedCount = stage.requirements.length;

      // ← APROBAR TODOS LOS REQUERIMIENTOS EN LA BD
      for (const requirement of stage.requirements) {
        await executeQuery(`
          INSERT INTO requirement_validations 
          (project_id, stage_name, requirement_id, status, admin_comments, reviewed_by, reviewed_at)
          VALUES (?, ?, ?, 'approved', ?, ?, NOW())
          ON DUPLICATE KEY UPDATE 
            status = 'approved',
            admin_comments = VALUES(admin_comments),
            reviewed_by = VALUES(reviewed_by),
            reviewed_at = NOW(),
            updated_at = NOW()
        `, [project_id, stage_name, requirement.id, admin_comments, req.user.id]);
      }

      // ← MARCAR LA ETAPA COMO COMPLETADA
      try {
        await Project.updateStage(
          project_id,
          stage_name,
          'completed',
          admin_comments || `Todos los ${approvedCount} requerimientos de la etapa aprobados masivamente`
        );
      } catch (stageError) {
        console.error('Error actualizando etapa:', stageError);
      }

      console.log(`✅ ${approvedCount} requerimientos aprobados en etapa ${stage_name}`);

      res.json({
        success: true,
        message: `Etapa ${stage_name} aprobada completamente. ${approvedCount} requerimientos aprobados.`,
        data: {
          project_id: parseInt(project_id),
          stage_name,
          approved_requirements: approvedCount,
          admin_comments,
          approved_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error aprobando requerimientos de etapa:', error);
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

      console.log(`📋 Obteniendo historial de requerimiento ${requirement_id}`);

      // Verificar proyecto y permisos
      const project = await Project.findById(project_id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      if (req.user.role !== 'admin' && project.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este requerimiento'
        });
      }

      // Obtener todos los documentos del requerimiento
      const documents = await Document.getAllByRequirement(project_id, stage_name, requirement_id);

      res.json({
        success: true,
        data: {
          documents,
          project: {
            id: project.id,
            code: project.code,
            title: project.title
          },
          requirement: {
            stage_name,
            requirement_id,
            requirement_name: RequirementController.getRequirementName(stage_name, requirement_id)
          },
          total: documents.length
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo historial del requerimiento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // ← OBTENER ESTADÍSTICAS CON DATOS REALES
  static async getRequirementStats(req, res) {
    try {
      const { project_id } = req.params;

      const project = await Project.findById(project_id);
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
          message: 'No tienes permisos para ver las estadísticas de este proyecto'
        });
      }

      // ← CALCULAR ESTADÍSTICAS REALES DESDE LA BD
      await ensureRequirementValidationsTable();

      const validations = await executeQuery(`
        SELECT stage_name, status, COUNT(*) as count
        FROM requirement_validations 
        WHERE project_id = ?
        GROUP BY stage_name, status
      `, [project_id]);

      // Calcular estadísticas por etapa
      const stageStats = {};
      const documents = await Document.getByProject(project_id);

      Object.entries(stageRequirements).forEach(([stageId, stage]) => {
        const stageValidations = validations.filter(v => v.stage_name === stageId);
        const approvedCount = stageValidations.find(v => v.status === 'approved')?.count || 0;
        const rejectedCount = stageValidations.find(v => v.status === 'rejected')?.count || 0;
        const inReviewCount = stageValidations.find(v => v.status === 'in-review')?.count || 0;
        
        const stageDocuments = documents.filter(doc => doc.stage_name === stageId);

        stageStats[stageId] = {
          stage_name: stage.name,
          total_requirements: stage.requirements.length,
          approved_requirements: approvedCount,
          rejected_requirements: rejectedCount,
          in_review_requirements: inReviewCount,
          completion_percentage: Math.round((approvedCount / stage.requirements.length) * 100),
          total_documents: stageDocuments.length
        };
      });

      const overallApproved = Object.values(stageStats).reduce((sum, stat) => sum + stat.approved_requirements, 0);
      const overallTotal = Object.values(stageRequirements).reduce((sum, stage) => sum + stage.requirements.length, 0);

      res.json({
        success: true,
        data: {
          project: {
            id: project.id,
            code: project.code,
            title: project.title
          },
          stage_stats: stageStats,
          overall: {
            total_requirements: overallTotal,
            approved_requirements: overallApproved,
            completion_percentage: Math.round((overallApproved / overallTotal) * 100),
            total_documents: documents.length
          }
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // ← GENERAR INFORME CON DATOS REALES
  static async generateFinalReport(req, res) {
    try {
      const { project_id } = req.params;

      const project = await Project.findById(project_id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      // ← GENERAR INFORME CON DATOS REALES
      await ensureRequirementValidationsTable();

      const validations = await executeQuery(`
        SELECT rv.*, u.full_name as reviewed_by_name
        FROM requirement_validations rv
        LEFT JOIN users u ON rv.reviewed_by = u.id
        WHERE rv.project_id = ?
        ORDER BY rv.stage_name, rv.requirement_id
      `, [project_id]);

      const documents = await Document.getByProject(project_id, true);

      res.json({
        success: true,
        message: 'Informe final generado exitosamente',
        data: {
          project: {
            id: project.id,
            code: project.code,
            title: project.title,
            user_name: project.user_name
          },
          validations: validations,
          documents_summary: {
            total: documents.length,
            by_stage: Object.keys(stageRequirements).map(stageId => ({
              stage: stageId,
              documents: documents.filter(d => d.stage_name === stageId).length
            }))
          },
          generated_at: new Date().toISOString(),
          generated_by: req.user.full_name
        }
      });

    } catch (error) {
      console.error('❌ Error generando informe:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Helper: Obtener nombre del requerimiento
  static getRequirementName(stageName, requirementId) {
    try {
      const stage = stageRequirements[stageName];
      if (!stage) return requirementId;

      const requirement = stage.requirements.find(req => req.id === requirementId);
      return requirement ? requirement.name : requirementId;
    } catch (error) {
      return requirementId;
    }
  }
}

module.exports = RequirementController;