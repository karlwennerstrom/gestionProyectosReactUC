const Document = require('../models/Document');
const Project = require('../models/Project');
const User = require('../models/User');
const emailService = require('../services/emailService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { stageRequirements } = require('../config/stageRequirements');
const { executeQuery } = require('../config/database'); // ← AGREGADO

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

// ← FUNCIÓN AUXILIAR PARA GESTIONAR ESTADOS DE REQUERIMIENTOS
const updateRequirementValidationStatus = async (projectId, stageName, requirementId, status, adminComments = null, reviewedBy = null) => {
  try {
    console.log(`🔄 Actualizando estado de requerimiento:`, {
      projectId, stageName, requirementId, status
    });

    // Verificar si existe la tabla requirement_validations
    const tableExists = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
        AND table_name = 'requirement_validations'
    `);

    if (tableExists[0].count > 0) {
      // ✅ TABLA EXISTE - GUARDAR ESTADO REAL
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
      `, [projectId, stageName, requirementId, status, adminComments, reviewedBy]);

      console.log(`✅ Estado de requerimiento actualizado en BD: ${status}`);
    } else {
      // ⚠️ TABLA NO EXISTE - CREAR AUTOMÁTICAMENTE
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

      console.log('✅ Tabla requirement_validations creada');

      // Ahora insertar el estado
      await executeQuery(`
        INSERT INTO requirement_validations 
        (project_id, stage_name, requirement_id, status, admin_comments, reviewed_by, reviewed_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [projectId, stageName, requirementId, status, adminComments, reviewedBy]);

      console.log(`✅ Estado inicial guardado: ${status}`);
    }
  } catch (error) {
    console.error('❌ Error actualizando estado de requerimiento:', error);
    // No lanzar error para no bloquear el upload
  }
};

// ← UPLOAD DOCUMENT - VERSIÓN COMPLETA CON FLUJO DE CORRECCIONES
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
        fileName: req.file?.originalname,
        userId: req.user.id
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

      // ← PASO 1: VERIFICAR ESTADO ACTUAL PARA DETECTAR CORRECCIONES
      let isCorrection = false;
      let previousStatus = null;
      try {
        const currentValidation = await executeQuery(`
          SELECT status, admin_comments FROM requirement_validations 
          WHERE project_id = ? AND stage_name = ? AND requirement_id = ?
        `, [project_id, stage_name, requirement_id]);

        if (currentValidation.length > 0) {
          previousStatus = currentValidation[0].status;
          if (previousStatus === 'rejected') {
            isCorrection = true;
            console.log('🔄 Detectada corrección de documento rechazado');
          }
        }
      } catch (error) {
        console.error('Error verificando estado anterior:', error);
      }

      // ← PASO 2: CREAR DOCUMENTO EN LA BD
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

      // ← PASO 3: ACTUALIZAR ESTADO DEL REQUERIMIENTO CON LÓGICA DE CORRECCIÓN
      try {
        let newStatus = 'in-review';
        let statusMessage;
        
        if (isCorrection) {
          statusMessage = `📝 DOCUMENTO CORREGIDO: ${req.file.originalname} - Reenviado a revisión`;
          console.log('🔄 Marcando como documento corregido');
        } else {
          statusMessage = `Documento subido: ${req.file.originalname}`;
        }

        // Actualizar estado del requerimiento
        await updateRequirementValidationStatus(
          project_id, 
          stage_name, 
          requirement_id, 
          newStatus,
          statusMessage,
          null // No hay reviewed_by porque el usuario subió el documento
        );

        console.log(`🔄 Estado del requerimiento actualizado a: ${newStatus}`);

      } catch (validationError) {
        console.error('⚠️ Error actualizando estado de requerimiento:', validationError);
        // No fallar el upload por esto
      }

      // ← PASO 4: ACTUALIZAR ESTADO DE LA ETAPA EN PROJECT_STAGES
      try {
        const currentStageStatus = await Project.getStageStatus(project_id, stage_name);
        console.log(`Estado actual de etapa ${stage_name}:`, currentStageStatus);
        
        if (currentStageStatus === 'rejected') {
          await Project.updateStage(
            project_id, 
            stage_name, 
            'in-progress', 
            isCorrection 
              ? 'Documento corregido subido - Enviado a revisión automáticamente'
              : 'Nuevos documentos subidos - Enviado a revisión automáticamente'
          );
          console.log(`✅ Etapa ${stage_name} cambiada de 'rejected' a 'in-progress'`);
        } else if (currentStageStatus === 'pending') {
          await Project.updateStage(
            project_id, 
            stage_name, 
            'in-progress', 
            'Documentos subidos - Enviado a revisión'
          );
          console.log(`✅ Etapa ${stage_name} cambiada de 'pending' a 'in-progress'`);
        }
      } catch (stageError) {
        console.error('⚠️ Error actualizando estado de etapa:', stageError);
        // No fallar el upload por esto, solo registrar el error
      }

      // ← PASO 5: ENVIAR NOTIFICACIONES POR EMAIL (CON LÓGICA DE CORRECCIÓN)
      try {
        // Obtener información del usuario
        const projectOwner = await User.findById(req.user.id);
        const requirementName = getRequirementName(stage_name, requirement_id);
        
        if (isCorrection) {
          // ← ES UNA CORRECCIÓN - USAR EMAIL ESPECIAL
          console.log('📧 Enviando notificaciones de corrección...');
          
          if (projectOwner && projectOwner.email) {
            // 1. Notificación al usuario (confirmación de corrección)
            await emailService.notifyDocumentUploadedConfirmation(
              projectOwner.email,
              projectOwner.full_name,
              project.code,
              stage_name,
              `${requirementName} (CORREGIDO)`,
              req.file.originalname
            );
            console.log(`✅ Email de confirmación de corrección enviado a ${projectOwner.email}`);
          }

          // 2. Notificación especial al admin sobre corrección
          const adminEmail = process.env.ADMIN_EMAIL;
          if (adminEmail) {
            const adminUser = await User.findByEmail(adminEmail);
            const adminName = adminUser ? adminUser.full_name : 'Administrador';
            
            await emailService.notifyDocumentUploadedForRequirement(
              adminEmail,
              adminName,
              projectOwner.email,
              projectOwner.full_name,
              project.code,
              project.title,
              stage_name,
              `${requirementName} (DOCUMENTO CORREGIDO)`,
              req.file.originalname
            );
            console.log(`📧 Email de corrección enviado al admin: ${adminEmail}`);
          }
        } else {
          // ← ES UN DOCUMENTO NUEVO - USAR EMAILS NORMALES
          console.log('📧 Enviando notificaciones de documento nuevo...');
          
          if (projectOwner && projectOwner.email) {
            // 1. Notificación al usuario (confirmación)
            await emailService.notifyDocumentUploadedConfirmation(
              projectOwner.email,
              projectOwner.full_name,
              project.code,
              stage_name,
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
        }
      } catch (emailError) {
        console.error('❌ Error enviando notificaciones por email:', emailError);
        // No fallar la operación por error de email
      }

      // ← RESPUESTA EXITOSA CON INFORMACIÓN DE CORRECCIÓN
      console.log('🎉 Upload completado exitosamente');

      res.status(201).json({
        success: true,
        message: isCorrection 
          ? 'Corrección subida exitosamente y enviada a revisión'
          : 'Documento subido exitosamente',
        data: { 
          document,
          requirement_status: 'in-review',
          is_correction: isCorrection,
          previous_status: previousStatus
        }
      });

    } catch (error) {
      // Limpiar archivo si hay error
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      
      console.error('❌ Error subiendo documento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    // ← ACTUALIZAR ESTADO DEL REQUERIMIENTO DESPUÉS DE ELIMINAR
    try {
      // Verificar si quedan más documentos para este requerimiento
      const remainingDocs = await executeQuery(`
        SELECT COUNT(*) as count 
        FROM documents 
        WHERE project_id = ? AND stage_name = ? AND requirement_id = ?
          AND (is_current = TRUE OR is_current IS NULL)
      `, [document.project_id, document.stage_name, document.requirement_id]);

      if (remainingDocs[0].count === 0) {
        // No quedan documentos, volver a pendiente
        await updateRequirementValidationStatus(
          document.project_id,
          document.stage_name,
          document.requirement_id,
          'pending',
          'Documento eliminado - Sin archivos pendientes',
          req.user.id
        );
        console.log('📝 Estado del requerimiento actualizado a pendiente (sin documentos)');
      }
    } catch (error) {
      console.error('Error actualizando estado después de eliminar:', error);
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