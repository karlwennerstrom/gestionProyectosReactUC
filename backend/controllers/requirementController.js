// backend/controllers/documentController.js - SECCIÓN CORREGIDA

// Cambiar esta línea en el método uploadDocument:
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

// POR ESTE CÓDIGO MEJORADO:

// Subir documento con manejo de errores mejorado
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

      // Verificar permisos
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

      // CREAR DOCUMENTO CON MANEJO DE ERRORES MEJORADO
      let document;
      try {
        console.log('📝 Intentando crear documento...');
        
        // MÉTODO 1: Crear documento normal
        document = await Document.create({
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
        
      } catch (createError) {
        console.error('❌ Error en Document.create:', createError);
        
        // MÉTODO 2: Si falla, usar createSimple
        if (createError.message.includes('CANT_UPDATE_USED_TABLE_IN_SF_OR_TRG')) {
          console.log('🔄 Intentando con método alternativo...');
          
          try {
            document = await Document.createSimple({
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
          } catch (simpleError) {
            console.error('❌ Error en createSimple:', simpleError);
            
            // MÉTODO 3: Inserción directa
            console.log('🔄 Intentando inserción directa...');
            
            const { executeQuery } = require('../config/database');
            const result = await executeQuery(`
              INSERT INTO documents 
              (project_id, stage_name, requirement_id, file_name, original_name, file_path, file_size, mime_type, uploaded_by, uploaded_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
              project_id,
              stage_name,
              requirement_id,
              req.file.filename,
              req.file.originalname,
              req.file.path,
              req.file.size,
              req.file.mimetype,
              req.user.id
            ]);

            if (result.insertId) {
              document = await Document.findById(result.insertId);
            } else {
              throw new Error('No se pudo crear el documento con ningún método');
            }
          }
        } else {
          throw createError;
        }
      }

      if (!document) {
        await fs.unlink(req.file.path).catch(console.error);
        return res.status(500).json({
          success: false,
          message: 'Error creando el registro del documento'
        });
      }

      console.log('✅ Documento creado exitosamente en BD:', {
        id: document.id,
        project_id: document.project_id,
        stage_name: document.stage_name,
        requirement_id: document.requirement_id,
        original_name: document.original_name
      });

      // 📧 ENVIAR NOTIFICACIONES POR EMAIL
      try {
        const projectOwner = await User.findById(req.user.id);
        if (projectOwner && projectOwner.email) {
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

        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
          const adminUser = await User.findByEmail(adminEmail);
          const adminName = adminUser ? adminUser.full_name : 'Administrador';
          const requirementName = getRequirementName(stage_name, requirement_id);
          
          await emailService.notifyDocumentUploaded(
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
      }

      // ACTUALIZAR ESTADO DE ETAPA
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
      }

      console.log('📄 Documento creado exitosamente:', document);

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
      
      console.error('❌ Error general subiendo documento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor: ' + error.message
      });
    }
  });
};