// backend/controllers/stageManagementController.js - GESTIÓN COMPLETA DE ETAPAS
const { executeQuery, getOne, insertAndGetId } = require('../config/database');
const { stageRequirements } = require('../config/stageRequirements');

class StageManagementController {

  // ← OBTENER TODAS LAS ETAPAS CONFIGURADAS
  static async getAllStages(req, res) {
    try {
      // Combinar etapas desde config y desde BD (si las hay personalizadas)
      const customStages = await executeQuery(`
        SELECT * FROM custom_stages 
        ORDER BY stage_order ASC
      `);

      const allStages = {};

      // Primero agregar las etapas por defecto
      Object.keys(stageRequirements).forEach(stageId => {
        allStages[stageId] = {
          ...stageRequirements[stageId],
          id: stageId,
          is_default: true,
          can_modify: false
        };
      });

      // Luego agregar/sobreescribir con etapas personalizadas
      customStages.forEach(stage => {
        allStages[stage.stage_id] = {
          ...JSON.parse(stage.stage_config),
          id: stage.stage_id,
          is_default: false,
          can_modify: true,
          created_at: stage.created_at,
          updated_at: stage.updated_at
        };
      });

      res.json({
        success: true,
        data: {
          stages: Object.values(allStages),
          total: Object.keys(allStages).length
        }
      });

    } catch (error) {
      console.error('Error obteniendo etapas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // ← CREAR NUEVA ETAPA PERSONALIZADA
  static async createStage(req, res) {
    try {
      const { 
        stage_id, 
        name, 
        description, 
        icon, 
        color, 
        requirements = [],
        stage_order = 999
      } = req.body;

      // Validaciones
      if (!stage_id || !name || !description) {
        return res.status(400).json({
          success: false,
          message: 'stage_id, name y description son requeridos'
        });
      }

      // Verificar que no existe ya
      const existing = await getOne(`
        SELECT id FROM custom_stages WHERE stage_id = ?
      `, [stage_id]);

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe una etapa con ese ID'
        });
      }

      // Crear configuración de etapa
      const stageConfig = {
        name,
        description,
        icon: icon || '📋',
        color: color || 'blue',
        requirements: requirements.map((req, index) => ({
          id: req.id || `req_${Date.now()}_${index}`,
          name: req.name,
          description: req.description || '',
          required: req.required !== false,
          acceptedTypes: req.acceptedTypes || ['pdf', 'doc', 'docx'],
          maxSize: req.maxSize || '5MB'
        }))
      };

      // Insertar en BD
      const stageDbId = await insertAndGetId(`
        INSERT INTO custom_stages (stage_id, stage_config, stage_order, created_by)
        VALUES (?, ?, ?, ?)
      `, [stage_id, JSON.stringify(stageConfig), stage_order, req.user.id]);

      console.log(`✅ Nueva etapa creada: ${stage_id} por ${req.user.full_name}`);

      res.status(201).json({
        success: true,
        message: 'Etapa creada exitosamente',
        data: {
          id: stageDbId,
          stage_id,
          config: stageConfig,
          created_by: req.user.full_name
        }
      });

    } catch (error) {
      console.error('Error creando etapa:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // ← ACTUALIZAR ETAPA EXISTENTE
  static async updateStage(req, res)  {
    try {
      const { stage_id } = req.params;
      const { 
        name, 
        description, 
        icon, 
        color, 
        requirements = [],
        stage_order
      } = req.body;

      // Verificar que existe
      const existing = await getOne(`
        SELECT * FROM custom_stages WHERE stage_id = ?
      `, [stage_id]);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Etapa no encontrada'
        });
      }

      // Actualizar configuración
      const currentConfig = JSON.parse(existing.stage_config);
      const updatedConfig = {
        name: name || currentConfig.name,
        description: description || currentConfig.description,
        icon: icon || currentConfig.icon,
        color: color || currentConfig.color,
        requirements: requirements.length > 0 ? requirements.map((req, index) => ({
          id: req.id || `req_${Date.now()}_${index}`,
          name: req.name,
          description: req.description || '',
          required: req.required !== false,
          acceptedTypes: req.acceptedTypes || ['pdf', 'doc', 'docx'],
          maxSize: req.maxSize || '5MB'
        })) : currentConfig.requirements
      };

      // Actualizar en BD
      await executeQuery(`
        UPDATE custom_stages 
        SET stage_config = ?, 
            stage_order = ?,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = ?
        WHERE stage_id = ?
      `, [
        JSON.stringify(updatedConfig), 
        stage_order || existing.stage_order,
        req.user.id,
        stage_id
      ]);

      console.log(`✅ Etapa actualizada: ${stage_id} por ${req.user.full_name}`);

      res.json({
        success: true,
        message: 'Etapa actualizada exitosamente',
        data: {
          stage_id,
          config: updatedConfig,
          updated_by: req.user.full_name
        }
      });

    } catch (error) {
      console.error('Error actualizando etapa:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // ← ELIMINAR ETAPA PERSONALIZADA
  static async deleteStage(req, res)  {
    try {
      const { stage_id } = req.params;

      // Verificar que existe y es personalizada
      const existing = await getOne(`
        SELECT * FROM custom_stages WHERE stage_id = ?
      `, [stage_id]);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Etapa personalizada no encontrada'
        });
      }

      // Verificar que no hay proyectos usando esta etapa
      const projectsUsingStage = await executeQuery(`
        SELECT COUNT(*) as count FROM projects 
        WHERE current_stage = ? AND deleted_at IS NULL
      `, [stage_id]);

      if (projectsUsingStage[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar. ${projectsUsingStage[0].count} proyectos están usando esta etapa`
        });
      }

      // Eliminar
      await executeQuery(`
        DELETE FROM custom_stages WHERE stage_id = ?
      `, [stage_id]);

      console.log(`⚠️ Etapa personalizada eliminada: ${stage_id} por ${req.user.full_name}`);

      res.json({
        success: true,
        message: 'Etapa eliminada exitosamente',
        data: {
          stage_id,
          deleted_by: req.user.full_name
        }
      });

    } catch (error) {
      console.error('Error eliminando etapa:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // ← GESTIONAR REQUERIMIENTOS ESPECÍFICOS
  static async getRequirements(req, res)  {
    try {
      const { stage_id } = req.params;

      // Obtener requerimientos de la etapa
      let requirements = [];

      // Primero verificar si es etapa por defecto
      if (stageRequirements[stage_id]) {
        requirements = stageRequirements[stage_id].requirements;
      } else {
        // Buscar en etapas personalizadas
        const customStage = await getOne(`
          SELECT stage_config FROM custom_stages WHERE stage_id = ?
        `, [stage_id]);

        if (customStage) {
          const config = JSON.parse(customStage.stage_config);
          requirements = config.requirements || [];
        }
      }

      res.json({
        success: true,
        data: {
          stage_id,
          requirements,
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

  // ← AGREGAR REQUERIMIENTO A ETAPA
  static async addRequirement(req, res)  {
    try {
      const { stage_id } = req.params;
      const { 
        requirement_id,
        name, 
        description = '', 
        required = true, 
        acceptedTypes = ['pdf', 'doc', 'docx'], 
        maxSize = '5MB' 
      } = req.body;

      if (!requirement_id || !name) {
        return res.status(400).json({
          success: false,
          message: 'requirement_id y name son requeridos'
        });
      }

      // Solo se puede modificar etapas personalizadas
      const customStage = await getOne(`
        SELECT * FROM custom_stages WHERE stage_id = ?
      `, [stage_id]);

      if (!customStage) {
        return res.status(400).json({
          success: false,
          message: 'Solo se pueden modificar etapas personalizadas'
        });
      }

      const config = JSON.parse(customStage.stage_config);
      
      // Verificar que no existe el requerimiento
      const existingReq = config.requirements.find(req => req.id === requirement_id);
      if (existingReq) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe un requerimiento con ese ID'
        });
      }

      // Agregar nuevo requerimiento
      const newRequirement = {
        id: requirement_id,
        name,
        description,
        required,
        acceptedTypes,
        maxSize
      };

      config.requirements.push(newRequirement);

      // Actualizar en BD
      await executeQuery(`
        UPDATE custom_stages 
        SET stage_config = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
        WHERE stage_id = ?
      `, [JSON.stringify(config), req.user.id, stage_id]);

      console.log(`✅ Requerimiento agregado: ${requirement_id} a etapa ${stage_id}`);

      res.status(201).json({
        success: true,
        message: 'Requerimiento agregado exitosamente',
        data: {
          stage_id,
          requirement: newRequirement,
          total_requirements: config.requirements.length
        }
      });

    } catch (error) {
      console.error('Error agregando requerimiento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // ← ACTUALIZAR REQUERIMIENTO ESPECÍFICO
  static async updateRequirement(req, res)  {
    try {
      const { stage_id, requirement_id } = req.params;
      const { name, description, required, acceptedTypes, maxSize } = req.body;

      const customStage = await getOne(`
        SELECT * FROM custom_stages WHERE stage_id = ?
      `, [stage_id]);

      if (!customStage) {
        return res.status(400).json({
          success: false,
          message: 'Solo se pueden modificar etapas personalizadas'
        });
      }

      const config = JSON.parse(customStage.stage_config);
      
      // Encontrar y actualizar requerimiento
      const reqIndex = config.requirements.findIndex(req => req.id === requirement_id);
      if (reqIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Requerimiento no encontrado'
        });
      }

      // Actualizar campos proporcionados
      if (name) config.requirements[reqIndex].name = name;
      if (description !== undefined) config.requirements[reqIndex].description = description;
      if (required !== undefined) config.requirements[reqIndex].required = required;
      if (acceptedTypes) config.requirements[reqIndex].acceptedTypes = acceptedTypes;
      if (maxSize) config.requirements[reqIndex].maxSize = maxSize;

      // Actualizar en BD
      await executeQuery(`
        UPDATE custom_stages 
        SET stage_config = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
        WHERE stage_id = ?
      `, [JSON.stringify(config), req.user.id, stage_id]);

      console.log(`✅ Requerimiento actualizado: ${requirement_id} en etapa ${stage_id}`);

      res.json({
        success: true,
        message: 'Requerimiento actualizado exitosamente',
        data: {
          stage_id,
          requirement: config.requirements[reqIndex]
        }
      });

    } catch (error) {
      console.error('Error actualizando requerimiento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // ← ELIMINAR REQUERIMIENTO
  static async deleteRequirement(req, res)  {
    try {
      const { stage_id, requirement_id } = req.params;

      const customStage = await getOne(`
        SELECT * FROM custom_stages WHERE stage_id = ?
      `, [stage_id]);

      if (!customStage) {
        return res.status(400).json({
          success: false,
          message: 'Solo se pueden modificar etapas personalizadas'
        });
      }

      const config = JSON.parse(customStage.stage_config);
      
      // Verificar que no hay documentos subidos para este requerimiento
      const documentsUsingReq = await executeQuery(`
        SELECT COUNT(*) as count FROM documents 
        WHERE stage_name = ? AND requirement_id = ?
      `, [stage_id, requirement_id]);

      if (documentsUsingReq[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar. ${documentsUsingReq[0].count} documentos están asociados a este requerimiento`
        });
      }

      // Eliminar requerimiento
      config.requirements = config.requirements.filter(req => req.id !== requirement_id);

      // Actualizar en BD
      await executeQuery(`
        UPDATE custom_stages 
        SET stage_config = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
        WHERE stage_id = ?
      `, [JSON.stringify(config), req.user.id, stage_id]);

      console.log(`⚠️ Requerimiento eliminado: ${requirement_id} de etapa ${stage_id}`);

      res.json({
        success: true,
        message: 'Requerimiento eliminado exitosamente',
        data: {
          stage_id,
          requirement_id,
          remaining_requirements: config.requirements.length
        }
      });

    } catch (error) {
      console.error('Error eliminando requerimiento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // ← REORDENAR ETAPAS
  static async reorderStages(req, res)  {
    try {
      const { stage_orders } = req.body; // [{stage_id: 'formalization', order: 1}, ...]

      if (!Array.isArray(stage_orders)) {
        return res.status(400).json({
          success: false,
          message: 'stage_orders debe ser un array'
        });
      }

      // Actualizar órdenes para etapas personalizadas
      for (const stageOrder of stage_orders) {
        const { stage_id, order } = stageOrder;
        
        await executeQuery(`
          UPDATE custom_stages 
          SET stage_order = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
          WHERE stage_id = ?
        `, [order, req.user.id, stage_id]);
      }

      console.log(`✅ Etapas reordenadas por ${req.user.full_name}`);

      res.json({
        success: true,
        message: 'Etapas reordenadas exitosamente',
        data: {
          updated_stages: stage_orders.length,
          updated_by: req.user.full_name
        }
      });

    } catch (error) {
      console.error('Error reordenando etapas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // ← EXPORTAR CONFIGURACIÓN DE ETAPAS
  static async exportConfiguration(req, res)  {
    try {
      const customStages = await executeQuery(`
        SELECT stage_id, stage_config, stage_order FROM custom_stages 
        ORDER BY stage_order ASC
      `);

      const exportData = {
        export_date: new Date().toISOString(),
        exported_by: req.user.full_name,
        default_stages: stageRequirements,
        custom_stages: customStages.map(stage => ({
          stage_id: stage.stage_id,
          config: JSON.parse(stage.stage_config),
          order: stage.stage_order
        }))
      };

      res.json({
        success: true,
        data: exportData
      });

    } catch (error) {
      console.error('Error exportando configuración:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = StageManagementController;