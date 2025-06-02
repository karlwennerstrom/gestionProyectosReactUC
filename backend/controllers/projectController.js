const Project = require('../models/Project');
const User = require('../models/User');
const emailService = require('../services/emailService');

// Obtener todos los proyectos (admin) o proyectos del usuario
const getProjects = async (req, res) => {
  try {
    const { status, current_stage } = req.query;
    const filters = {};

    // Agregar filtros si están presentes
    if (status) filters.status = status;
    if (current_stage) filters.current_stage = current_stage;

    let projects;

    if (req.user.role === 'admin') {
      // Admin puede ver todos los proyectos
      projects = await Project.getAll(filters);
    } else {
      // Usuario solo ve sus proyectos
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

// Obtener proyecto por ID
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado'
      });
    }

    // Verificar permisos: admin puede ver todo, usuario solo sus proyectos
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

    // Validar campos requeridos
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Título y descripción son requeridos'
      });
    }

    // Crear proyecto
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

    // Validar estado
    const validStatuses = ['pending', 'in-progress', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser: ' + validStatuses.join(', ')
      });
    }

    // Verificar que el proyecto existe
    const existingProject = await Project.findById(id);
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado'
      });
    }

    // Actualizar estado
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

// Actualizar etapa específica del proyecto (solo admin) - CON NOTIFICACIONES
const updateProjectStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage_name, status, admin_comments } = req.body;

    // Validar etapa
    const validStages = ['formalization', 'design', 'delivery', 'operation', 'maintenance'];
    if (!validStages.includes(stage_name)) {
      return res.status(400).json({
        success: false,
        message: 'Etapa inválida. Debe ser: ' + validStages.join(', ')
      });
    }

    // Validar estado de etapa
    const validStageStatuses = ['pending', 'in-progress', 'completed', 'rejected'];
    if (!validStageStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado de etapa inválido. Debe ser: ' + validStageStatuses.join(', ')
      });
    }

    // Obtener proyecto y usuario antes de actualizar
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado'
      });
    }

    // Obtener datos del usuario para el email
    const projectOwner = await User.findById(project.user_id);
    if (!projectOwner) {
      console.warn(`Usuario no encontrado para proyecto ${id}`);
    }

    // Actualizar etapa
    const stages = await Project.updateStage(id, stage_name, status, admin_comments);

    // 📧 ENVIAR NOTIFICACIÓN POR EMAIL
    if (projectOwner && projectOwner.email) {
      try {
        if (status === 'completed') {
          // Etapa aprobada
          await emailService.notifyStageApproved(
            projectOwner.email,
            projectOwner.full_name,
            project.code,
            project.title,
            stage_name,
            admin_comments || `Etapa ${stage_name} aprobada exitosamente`
          );
          console.log(`✅ Email de aprobación enviado a ${projectOwner.email}`);
        } else if (status === 'rejected') {
          // Etapa rechazada
          await emailService.notifyStageRejected(
            projectOwner.email,
            projectOwner.full_name,
            project.code,
            project.title,
            stage_name,
            admin_comments || 'La etapa requiere correcciones'
          );
          console.log(`📧 Email de rechazo enviado a ${projectOwner.email}`);
        }
      } catch (emailError) {
        console.error('❌ Error enviando notificación por email:', emailError);
        // No fallar la operación por error de email
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

// Mover proyecto a siguiente etapa (solo admin) - OBSOLETO
const moveToNextStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_comments } = req.body;

    // Verificar que el proyecto existe
    const existingProject = await Project.findById(id);
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado'
      });
    }

    // Mover a siguiente etapa
    const project = await Project.moveToNextStage(id, admin_comments);

    res.json({
      success: true,
      message: 'Proyecto movido a la siguiente etapa exitosamente',
      data: { project }
    });

  } catch (error) {
    console.error('Error moviendo proyecto a siguiente etapa:', error);
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

    res.json({
      success: true,
      data: { stats }
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

    // Agregar filtros si están presentes
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

// Eliminar proyecto (solo admin o propietario)
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el proyecto existe
    const existingProject = await Project.findById(id);
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado'
      });
    }

    // Verificar permisos: admin puede eliminar cualquiera, usuario solo sus proyectos
    if (req.user.role !== 'admin' && existingProject.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar este proyecto'
      });
    }

    // Eliminar proyecto
    const deleted = await Project.delete(id);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Error eliminando el proyecto'
      });
    }

    res.json({
      success: true,
      message: 'Proyecto eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando proyecto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// 🧪 ENDPOINT DE PRUEBA PARA EMAILS
const testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    // Verificar conexión SMTP
    const isConnected = await emailService.verifyConnection();
    if (!isConnected) {
      return res.status(500).json({
        success: false,
        message: 'Error conectando al servidor SMTP. Verifica la configuración.'
      });
    }

    // Enviar email de prueba
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
  getProjectById,
  createProject,
  updateProjectStatus,
  updateProjectStage,
  moveToNextStage,
  getProjectStats,
  getMyProjects,
  deleteProject,
  testEmail
};