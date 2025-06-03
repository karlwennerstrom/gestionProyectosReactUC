// backend/controllers/requirementController.js
const Document = require('../models/Document');
const Project = require('../models/Project');
const { stageRequirements } = require('../config/stageRequirements');
const { executeQuery, getOne } = require('../config/database');
function determineRequirementStatus(documents, currentDoc) {
  if (!currentDoc) {
    return 'pending'; // Sin documentos
  }
  if (documents.length > 0) {
    return 'in-review'; // Tiene documentos, en revisión
  }
  return 'pending';
}
class RequirementController {
  
  // Obtener requerimientos de un proyecto con estado de documentos
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

      // Obtener todos los documentos del proyecto
      const documents = await Document.getByProject(project_id, true); // incluir históricos

      console.log(`📄 Documentos encontrados: ${documents.length}`);

      // Crear array de requerimientos con estado
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
    // DEBUG: Ver qué documentos encuentra
        console.log(`🔍 Requerimiento ${requirement.id}:`, {
        requirementDocs: requirementDocs.length,
        currentDoc: currentDoc ? currentDoc.original_name : 'null',
        hasIsCurrentField: requirementDocs.length > 0 ? requirementDocs[0].hasOwnProperty('is_current') : 'no docs'
        });
    // Crear objeto de requerimiento
    const requirementData = {
      project_id: parseInt(project_id),
      stage_name: stageId,
      requirement_id: requirement.id,
      requirement_name: requirement.name,
      required: requirement.required || false,
      
      // Estado del requerimiento
      status: determineRequirementStatus(requirementDocs, currentDoc),

      
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
      
      // Comentarios del admin (se podría agregar una tabla specific)
      admin_comments: null, // TODO: Implementar tabla requirement_validations
      reviewed_at: currentDoc?.uploaded_at || null,
      reviewed_by: null // TODO: Implementar
    };

    requirements.push(requirementData);
  });
});

      console.log(`✅ ${requirements.length} requerimientos procesados`);

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
  

  // Determinar el estado de un requerimiento basado en documentos


  // Actualizar estado de requerimiento específico (solo admin)
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

      // TODO: Crear tabla requirement_validations para persistir estados
      // Por ahora, simular actualización exitosa

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

  // Aprobar todos los requerimientos de una etapa (solo admin)
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

      // Obtener todos los requerimientos de la etapa
      const stage = stageRequirements[stage_name];
      const approvedCount = stage.requirements.length;

      // TODO: Actualizar estados en requirement_validations
      // Por ahora, actualizar la etapa en project_stages

      try {
        await Project.updateStage(
          project_id,
          stage_name,
          'completed',
          admin_comments || `Todos los ${approvedCount} requerimientos de la etapa aprobados`
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

  // Obtener estadísticas de requerimientos de un proyecto
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

      // Calcular estadísticas por etapa
      const stageStats = {};
      const documents = await Document.getByProject(project_id);

      Object.entries(stageRequirements).forEach(([stageId, stage]) => {
        const stageDocuments = documents.filter(doc => doc.stage_name === stageId);
        const completedRequirements = stage.requirements.filter(req => 
          stageDocuments.some(doc => doc.requirement_id === req.id)
        ).length;

        stageStats[stageId] = {
          stage_name: stage.name,
          total_requirements: stage.requirements.length,
          completed_requirements: completedRequirements,
          completion_percentage: Math.round((completedRequirements / stage.requirements.length) * 100),
          total_documents: stageDocuments.length
        };
      });

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
            total_requirements: Object.values(stageRequirements).reduce((sum, stage) => sum + stage.requirements.length, 0),
            completed_requirements: Object.values(stageStats).reduce((sum, stat) => sum + stat.completed_requirements, 0),
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

  // Generar informe final del proyecto (solo admin)
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

      // TODO: Implementar generación de informe final
      // Por ahora, retornar datos básicos

      res.json({
        success: true,
        message: 'Informe final generado exitosamente',
        data: {
          project: {
            id: project.id,
            code: project.code,
            title: project.title
          },
          generated_at: new Date().toISOString(),
          // TODO: Agregar más detalles del informe
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