// backend/controllers/projectController.js - CON ELIMINACIÓN LÓGICA
const Project = require('../models/Project');
const User = require('../models/User');
const emailService = require('../services/emailService');

// Obtener todos los proyectos (admin) o proyectos del usuario
const getProjects = async (req, res) => {
  try {
    const { status, current_stage } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (current_stage) filters.current_stage = current_stage;

    let projects;

    if (req.user.role === 'admin') {
      projects = await Project.getAll(filters);
    } else {
      filters.user_id = req.user.id;
      projects = await Project.getAll(filters);
    }

    res.json({
      success: true,
      data: {
        projects,
        total: projects.length,
        user_role: req.user.role
      }
    });

  } catch (error) {
    console.error('Error obteniendo proyectos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ← NUEVO: Obtener proyectos eliminados (solo admin)
const getDeletedProjects = async (req, res) => {
  try {
    const { deleted_by } = req.query;
    const filters = {};

    if (deleted_by) filters.deleted_by = deleted_by;

    const deletedProjects = await Project.getDeleted(filters);
    const deletionStats = await Project.getDeletionStats();

    res.json({
      success: true,
      data: {
        projects: deletedProjects,
        total: deletedProjects.length,
        stats: deletionStats
      }
    });

  } catch (error) {
    console.error('Error obteniendo proyectos eliminados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener proyecto por ID
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const { include_deleted } = req.query;
    
    const project = await Project.findById(id, include_deleted === 'true');

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

    res.json({
      success: true,
      data: { project }
    });

  } catch (error) {
    console.error('Error obteniendo proyecto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear nuevo proyecto
const createProject = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Título y descripción son requeridos'
      });
    }

    const project = await Project.create({
      title: title.trim(),
      description: description.trim(),
      user_id: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Proyecto creado exitosamente',
      data: { project }
    });

  } catch (error) {
    console.error('Error creando proyecto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar estado del proyecto (solo admin)
const updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_comments } = req.body;

    const validStatuses = ['pending', 'in-progress', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser: ' + validStatuses.join(', ')
      });
    }

    const existingProject = await Project.findById(id);
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado'
      });
    }

    const project = await Project.updateStatus(id, status, admin_comments);

    res.json({
      success: true,
      message: `Proyecto ${status === 'approved' ? 'aprobado' : status === 'rejected' ? 'rechazado' : 'actualizado'} exitosamente`,
      data: { project }
    });

  } catch (error) {
    console.error('Error actualizando estado del proyecto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar etapa específica del proyecto (solo admin)
const updateProjectStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage_name, status, admin_comments } = req.body;

    const validStages = ['formalization', 'design', 'delivery', 'operation', 'maintenance'];
    if (!validStages.includes(stage_name)) {
      return res.status(400).json({
        success: false,
        message: 'Etapa inválida. Debe ser: ' + validStages.join(', ')
      });
    }

    const validStageStatuses = ['pending', 'in-progress', 'completed', 'rejected'];
    if (!validStageStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado de etapa inválido. Debe ser: ' + validStageStatuses.join(', ')
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado'
      });
    }

    const projectOwner = await User.findById(project.user_id);

    const stages = await Project.updateStage(id, stage_name, status, admin_comments);

    // ← NOTIFICACIONES MEJORADAS POR EMAIL
    if (projectOwner && projectOwner.email) {
      try {
        if (status === 'completed') {
          await emailService.notifyStageApproved(
            projectOwner.email,
            projectOwner.full_name,
            project.code,
            project.title,
            stage_name,
            admin_comments || `Etapa ${stage_name} aprobada exitosamente`
          );
          console.log(`✅ Email de aprobación de etapa enviado a ${projectOwner.email}`);
        } else if (status === 'rejected') {
          await emailService.notifyStageRejected(
            projectOwner.email,
            projectOwner.full_name,
            project.code,
            project.title,
            stage_name,
            admin_comments || 'La etapa requiere correcciones'
          );
          console.log(`📧 Email de rechazo de etapa enviado a ${projectOwner.email}`);
        } else if (status === 'in-progress') {
          // Nueva notificación para revisión
          await emailService.notifyStageInReview(
            projectOwner.email,
            projectOwner.full_name,
            project.code,
            project.title,
            stage_name,
            admin_comments || 'Etapa en proceso de revisión'
          );
          console.log(`🔄 Email de revisión de etapa enviado a ${projectOwner.email}`);
        }
      } catch (emailError) {
        console.error('❌ Error enviando notificación de etapa por email:', emailError);
      }
    }

    res.json({
      success: true,
      message: `Etapa ${stage_name} actualizada exitosamente`,
      data: { stages }
    });

  } catch (error) {
    console.error('Error actualizando etapa del proyecto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de proyectos (solo admin)
const getProjectStats = async (req, res) => {
  try {
    const stats = await Project.getStats();
    const deletionStats = await Project.getDeletionStats();

    res.json({
      success: true,
      data: { 
        stats: {
          ...stats,
          deletion: deletionStats
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
};

// Obtener proyectos del usuario autenticado
const getMyProjects = async (req, res) => {
  try {
    const { status, current_stage } = req.query;
    const filters = { user_id: req.user.id };

    if (status) filters.status = status;
    if (current_stage) filters.current_stage = current_stage;

    const projects = await Project.getAll(filters);

    res.json({
      success: true,
      data: {
        projects,
        total: projects.length,
        user: {
          id: req.user.id,
          name: req.user.full_name
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo mis proyectos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ← MODIFICADO: Eliminación lógica en lugar de física
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body; // Motivo opcional de eliminación

    const existingProject = await Project.findById(id);
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado'
      });
    }

    // Verificar permisos: solo admin puede eliminar
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden eliminar proyectos'
      });
    }

    // Realizar eliminación lógica
    const deleted = await Project.softDelete(id, req.user.id, reason);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Error eliminando el proyecto'
      });
    }

    res.json({
      success: true,
      message: 'Proyecto eliminado exitosamente',
      data: {
        project_id: id,
        project_code: existingProject.code,
        deleted_by: req.user.full_name,
        deletion_reason: reason,
        deleted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error eliminando proyecto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ← NUEVO: Restaurar proyecto eliminado (solo admin)
const restoreProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.restore(id, req.user.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado o no está eliminado'
      });
    }

    res.json({
      success: true,
      message: 'Proyecto restaurado exitosamente',
      data: { 
        project,
        restored_by: req.user.full_name,
        restored_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error restaurando proyecto:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
};

// ← NUEVO: Eliminación física permanente (solo para casos extremos)
const permanentDeleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirm } = req.body;

    if (confirm !== 'ELIMINAR_PERMANENTE') {
      return res.status(400).json({
        success: false,
        message: 'Confirmación requerida. Envía confirm: "ELIMINAR_PERMANENTE"'
      });
    }

    const existingProject = await Project.findById(id, true); // incluir eliminados
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado'
      });
    }

    if (!existingProject.deleted_at) {
      return res.status(400).json({
        success: false,
        message: 'El proyecto debe estar eliminado lógicamente antes de la eliminación permanente'
      });
    }

    const deleted = await Project.hardDelete(id);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Error eliminando el proyecto permanentemente'
      });
    }

    console.log(`⚠️ Proyecto ${existingProject.code} eliminado PERMANENTEMENTE por ${req.user.full_name}`);

    res.json({
      success: true,
      message: 'Proyecto eliminado permanentemente',
      data: {
        project_code: existingProject.code,
        permanently_deleted_by: req.user.full_name,
        warning: 'Esta acción no se puede deshacer'
      }
    });

  } catch (error) {
    console.error('Error eliminando proyecto permanentemente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Test de email (mantenido)
const testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    const isConnected = await emailService.verifyConnection();
    if (!isConnected) {
      return res.status(500).json({
        success: false,
        message: 'Error conectando al servidor SMTP. Verifica la configuración.'
      });
    }

    const result = await emailService.sendTestEmail(email, req.user.full_name);

    if (result.success) {
      res.json({
        success: true,
        message: 'Email de prueba enviado exitosamente',
        data: { messageId: result.messageId }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error enviando email de prueba',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error en prueba de email:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getProjects,
  getDeletedProjects, // ← NUEVO
  getProjectById,
  createProject,
  updateProjectStatus,
  updateProjectStage,
  getProjectStats,
  getMyProjects,
  deleteProject, // Ahora es eliminación lógica
  restoreProject, // ← NUEVO
  permanentDeleteProject, // ← NUEVO
  testEmail
};