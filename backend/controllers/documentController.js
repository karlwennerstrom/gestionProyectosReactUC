const Document = require('../models/Document');
const Project = require('../models/Project');
const User = require('../models/User');
const emailService = require('../services/emailService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { stageRequirements } = require('../config/stageRequirements');

// Helper function para obtener nombre del requerimiento
const getRequirementName = (stageName, requirementId) => {
  try {
    if (!stageRequirements[stageName]) {
      return `Requerimiento ${requirementId}`;
    }
    
    const requirement = stageRequirements[stageName].requirements.find(
      req => req.id === requirementId
    );
    
    return requirement ? requirement.name : `Requerimiento ${requirementId}`;
  } catch (error) {
    console.error('Error obteniendo nombre del requerimiento:', error);
    return `Requerimiento ${requirementId}`;
  }
};

// Configuración de multer para upload de archivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    
    // Crear directorio si no existe
    try {
      await fs.mkdir(uploadPath, { recursive: true });
    } catch (error) {
      console.error('Error creando directorio uploads:', error);
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generar nombre único manteniendo la extensión original
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Filtro de archivos permitidos
const fileFilter = (req, file, cb) => {
  // Tipos de archivo permitidos
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido'), false);
  }
};

// Configurar multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  }
});

// Middleware para upload de archivo único
const uploadSingle = upload.single('document');

// Subir documento
const uploadDocument = async (req, res) => {
  uploadSingle(req, res, async (err) => {
    try {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'El archivo es demasiado grande. Máximo 10MB permitido.'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Error de upload: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se seleccionó ningún archivo'
        });
      }

      const { project_id, stage_name, requirement_id } = req.body;

      console.log('📥 Datos recibidos en upload:', {
        project_id,
        stage_name,
        requirement_id,
        fileName: req.file?.originalname
      });

      // Validar campos requeridos
      if (!project_id || !stage_name || !requirement_id) {
        console.error('❌ Faltan campos requeridos:', { project_id, stage_name, requirement_id });
        // Eliminar archivo subido si hay error
        await fs.unlink(req.file.path).catch(console.error);
        return res.status(400).json({
          success: false,
          message: 'project_id, stage_name y requirement_id son requeridos'
        });
      }

      // Validar que el proyecto existe
      const project = await Project.findById(project_id);
      if (!project) {
        await fs.unlink(req.file.path).catch(console.error);
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      // Verificar permisos: admin puede subir a cualquier proyecto, usuario solo a sus proyectos
      if (req.user.role !== 'admin' && project.user_id !== req.user.id) {
        await fs.unlink(req.file.path).catch(console.error);
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para subir archivos a este proyecto'
        });
      }

      // Validar etapa
      const validStages = ['formalization', 'design', 'delivery', 'operation', 'maintenance'];
      if (!validStages.includes(stage_name)) {
        await fs.unlink(req.file.path).catch(console.error);
        return res.status(400).json({
          success: false,
          message: 'Etapa inválida'
        });
      }

      // Crear registro del documento
      const document = await Document.create({
        project_id,
        stage_name,
        requirement_id,
        file_name: req.file.filename,
        original_name: req.file.originalname,
        file_path: req.file.path,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        uploaded_by: req.user.id
      });

      console.log('✅ Documento creado en BD:', {
        id: document.id,
        project_id: document.project_id,
        stage_name: document.stage_name,
        requirement_id: document.requirement_id,
        original_name: document.original_name
      });

      // 📧 ENVIAR NOTIFICACIONES POR EMAIL
       // 📧 ENVIAR NOTIFICACIONES POR EMAIL
      try {
        // 1. Notificación al usuario (confirmación)
        const projectOwner = await User.findById(req.user.id);
        if (projectOwner && projectOwner.email) {
          // Obtener nombre del requerimiento
          const stageName = stage_name;
          const requirementName = getRequirementName(stage_name, requirement_id);
          
          await emailService.notifyDocumentUploadedConfirmation(
            projectOwner.email,
            projectOwner.full_name,
            project.code,
            stageName,
            requirementName,
            req.file.originalname
          );
          console.log(`✅ Email de confirmación enviado a ${projectOwner.email}`);
        }

        // 2. Notificación al admin
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
          const adminUser = await User.findByEmail(adminEmail);
          const adminName = adminUser ? adminUser.full_name : 'Administrador';
          const requirementName = getRequirementName(stage_name, requirement_id);
          
          // ← USAR EL NUEVO MÉTODO PARA REQUERIMIENTOS
          await emailService.notifyDocumentUploadedForRequirement(
            adminEmail,
            adminName,
            projectOwner.email,
            projectOwner.full_name,
            project.code,
            project.title,
            stage_name,
            requirementName,
            req.file.originalname
          );
          console.log(`📧 Email de notificación enviado al admin: ${adminEmail}`);
        }
      } catch (emailError) {
        console.error('❌ Error enviando notificaciones por email:', emailError);
        // No fallar la operación por error de email
      }

      // NUEVA FUNCIONALIDAD: Si la etapa estaba rechazada, cambiarla a en revisión
      try {
        const currentStageStatus = await Project.getStageStatus(project_id, stage_name);
        console.log(`Estado actual de etapa ${stage_name}:`, currentStageStatus);
        
        if (currentStageStatus === 'rejected') {
          await Project.updateStage(
            project_id, 
            stage_name, 
            'in-progress', 
            'Nuevos documentos subidos - Enviado a revisión automáticamente'
          );
          console.log(`Etapa ${stage_name} del proyecto ${project_id} cambiada de 'rejected' a 'in-progress'`);
        } else if (currentStageStatus === 'pending') {
          // Si la etapa estaba pendiente, cambiarla a en revisión
          await Project.updateStage(
            project_id, 
            stage_name, 
            'in-progress', 
            'Documentos subidos - Enviado a revisión'
          );
          console.log(`Etapa ${stage_name} del proyecto ${project_id} cambiada de 'pending' a 'in-progress'`);
        }
      } catch (stageError) {
        console.error('Error actualizando estado de etapa:', stageError);
        // No fallar el upload por esto, solo registrar el error
      }

      console.log('Documento creado exitosamente:', document);

      res.status(201).json({
        success: true,
        message: 'Documento subido exitosamente',
        data: { document }
      });

    } catch (error) {
      // Limpiar archivo si hay error
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      
      console.error('Error subiendo documento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  });
};

// Obtener documentos de un proyecto
const getProjectDocuments = async (req, res) => {
  try {
    const { project_id } = req.params;
    const { stage_name } = req.query;

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
        message: 'No tienes permisos para ver los documentos de este proyecto'
      });
    }

    let documents;
    if (stage_name) {
      documents = await Document.getByProjectAndStage(project_id, stage_name);
    } else {
      documents = await Document.getByProject(project_id);
    }

    res.json({
      success: true,
      data: {
        documents,
        project: {
          id: project.id,
          code: project.code,
          title: project.title
        },
        total: documents.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo documentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener documento por ID
const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Verificar permisos
    const accessCheck = await Document.canUserAccess(id, req.user.id, req.user.role);
    if (!accessCheck.canAccess) {
      return res.status(403).json({
        success: false,
        message: accessCheck.reason
      });
    }

    res.json({
      success: true,
      data: { document }
    });

  } catch (error) {
    console.error('Error obteniendo documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Descargar documento
const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Verificar permisos
    const accessCheck = await Document.canUserAccess(id, req.user.id, req.user.role);
    if (!accessCheck.canAccess) {
      return res.status(403).json({
        success: false,
        message: accessCheck.reason
      });
    }

    // Verificar que el archivo existe
    try {
      await fs.access(document.file_path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado en el servidor'
      });
    }

    // Configurar headers para descarga
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
    res.setHeader('Content-Type', document.mime_type);

    // Enviar archivo
    res.sendFile(path.resolve(document.file_path));

  } catch (error) {
    console.error('Error descargando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Eliminar documento
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Verificar permisos: admin puede eliminar cualquiera, usuario solo sus uploads
    if (req.user.role !== 'admin' && document.uploaded_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar este documento'
      });
    }

    // Eliminar documento
    const deleted = await Document.delete(id);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Error eliminando el documento'
      });
    }

    res.json({
      success: true,
      message: 'Documento eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener mis documentos
const getMyDocuments = async (req, res) => {
  try {
    const documents = await Document.getByUser(req.user.id);

    res.json({
      success: true,
      data: {
        documents,
        total: documents.length,
        user: {
          id: req.user.id,
          name: req.user.full_name
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo mis documentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de documentos (solo admin)
const getDocumentStats = async (req, res) => {
  try {
    const stats = await Document.getStats();

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

// Buscar documentos
const searchDocuments = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El término de búsqueda debe tener al menos 2 caracteres'
      });
    }

    let documents = await Document.searchByName(q.trim());

    // Filtrar por permisos si no es admin
    if (req.user.role !== 'admin') {
      // Usuario solo puede ver documentos de sus proyectos
      const userProjects = await Project.getByUserId(req.user.id);
      const userProjectIds = userProjects.map(p => p.id);
      
      documents = documents.filter(doc => 
        userProjectIds.includes(doc.project_id) || doc.uploaded_by === req.user.id
      );
    }

    res.json({
      success: true,
      data: {
        documents,
        total: documents.length,
        search_term: q
      }
    });

  } catch (error) {
    console.error('Error buscando documentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  uploadDocument,
  getProjectDocuments,
  getDocumentById,
  downloadDocument,
  deleteDocument,
  getMyDocuments,
  getDocumentStats,
  searchDocuments
};