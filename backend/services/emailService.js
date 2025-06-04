// backend/services/emailService.js - SIN AUTENTICACIÓN SMTP
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    // Verificar configuración mínima requerida
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
      console.warn('⚠️  Configuración SMTP incompleta. Se requiere SMTP_HOST y SMTP_PORT.');
      return;
    }

    // Configuración SMTP sin autenticación
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true', // true para puerto 465, false para otros
      tls: {
        rejectUnauthorized: false // Para servidores internos que no tienen certificados válidos
      }
    };

    // Solo agregar autenticación si están configuradas las credenciales
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      smtpConfig.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      };
      console.log('📧 Email service inicializado CON autenticación');
    } else {
      console.log('📧 Email service inicializado SIN autenticación');
    }

    this.transporter = nodemailer.createTransport(smtpConfig);

    console.log('🔧 Configuración SMTP aplicada:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'sistema@uc.cl'
    });
  }

  async verifyConnection() {
    if (!this.transporter) {
      console.log('❌ Transporter no inicializado');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ Conexión SMTP verificada exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error verificando conexión SMTP:', error.message);
      console.error('   - Host:', process.env.SMTP_HOST);
      console.error('   - Port:', process.env.SMTP_PORT);
      console.error('   - Secure:', process.env.SMTP_SECURE);
      return false;
    }
  }

  // NUEVO: Notificación de documento corregido
  async notifyDocumentCorrected(userEmail, userName, adminEmail, adminName, projectCode, projectTitle, stageName, requirementName, fileName) {
    const stageNames = {
      'formalization': 'Formalización',
      'design': 'Diseño y Validación',
      'delivery': 'Entrega y Configuración',
      'operation': 'Aceptación Operacional',
      'maintenance': 'Operación y Mantenimiento'
    };

    // Email al usuario (confirmación de corrección)
    const userContent = `
      <h2>📝 Corrección Enviada</h2>
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Tu corrección ha sido enviada exitosamente y está siendo revisada.</p>
      
      <div style="background-color: #fff7ed; border: 1px solid #fed7aa; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #ea580c; margin-top: 0;">📋 Documento Corregido</h3>
        <p><strong>Proyecto:</strong> ${projectCode} - ${projectTitle}</p>
        <p><strong>Etapa:</strong> ${stageNames[stageName] || stageName}</p>
        <p><strong>Requerimiento:</strong> ${requirementName}</p>
        <p><strong>Archivo corregido:</strong> ${fileName}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CL')}</p>
      </div>

      <p>✅ Tu documento corregido ha sido enviado a revisión. Recibirás una notificación cuando se complete la nueva evaluación.</p>
    `;

    const userMailOptions = {
      from: this.getFromAddress(),
      to: userEmail,
      subject: `📝 Corrección Enviada: ${requirementName} - ${projectCode}`,
      html: this.getBaseTemplate(userContent, 'Corrección Enviada')
    };

    // Email al admin (notificación de corrección)
    const adminContent = `
      <h2>📝 Documento Corregido Para Revisión</h2>
      <p>Hola <strong>${adminName}</strong>,</p>
      <p>Un usuario ha enviado una corrección que requiere tu revisión.</p>
      
      <div style="background-color: #fff7ed; border: 1px solid #fed7aa; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #ea580c; margin-top: 0;">📋 Corrección Pendiente</h3>
        <p><strong>Usuario:</strong> ${userName} (${userEmail})</p>
        <p><strong>Proyecto:</strong> ${projectCode} - ${projectTitle}</p>
        <p><strong>Etapa:</strong> ${stageNames[stageName] || stageName}</p>
        <p><strong>Requerimiento:</strong> ${requirementName}</p>
        <p><strong>Archivo corregido:</strong> ${fileName}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CL')}</p>
      </div>

      <p>🔄 <strong>Acción requerida:</strong> El usuario ha corregido el documento previamente rechazado. Por favor revisa la nueva versión.</p>

      <p style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin" class="button">
          Revisar Corrección
        </a>
      </p>
    `;

    const adminMailOptions = {
      from: this.getFromAddress(),
      to: adminEmail,
      subject: `📝 Corrección Para Revisar: ${requirementName} - ${projectCode}`,
      html: this.getBaseTemplate(adminContent, 'Corrección Para Revisar')
    };

    // Enviar ambos emails
    try {
      await this.sendEmail(userMailOptions);
      await this.sendEmail(adminMailOptions);
      return { success: true };
    } catch (error) {
      console.error('Error enviando notificaciones de corrección:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener dirección From
  getFromAddress() {
    return process.env.SMTP_FROM || 
           process.env.SMTP_USER || 
           'sistema@uc.cl';
  }

  // Template base para emails
  getBaseTemplate(content, title = 'Sistema UC') {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          .status-approved { color: #16a34a; font-weight: bold; }
          .status-rejected { color: #dc2626; font-weight: bold; }
          .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 10px 0;
          }
          .button:hover {
            background-color: #1d4ed8;
          }
        </style>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">🏛️ Universidad Católica</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Sistema de Gestión de Proyectos</p>
        </div>
        
        <div style="background-color: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          ${content}
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">
          <p>Este es un email automático del Sistema UC. Por favor no responder a este mensaje.</p>
          <p>© ${new Date().getFullYear()} Universidad Católica - Todos los derechos reservados</p>
        </div>
      </body>
      </html>
    `;
  }

  async sendEmail(mailOptions) {
    if (!this.transporter) {
      throw new Error('Email service no configurado');
    }

    try {
      console.log('📧 Enviando email:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email enviado exitosamente:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error enviando email:', error);
      console.error('   - Error code:', error.code);
      console.error('   - Error message:', error.message);
      
      // Información adicional para debugging
      if (error.response) {
        console.error('   - SMTP Response:', error.response);
      }
      
      return { success: false, error: error.message };
    }
  }

  async sendTestEmail(toEmail, userName) {
    const content = `
      <h2>🧪 Email de Prueba</h2>
      <p>Hola <strong>${userName || 'Usuario'}</strong>,</p>
      <p>Este es un email de prueba del Sistema UC para verificar que las notificaciones por email están funcionando correctamente.</p>
      
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #166534; margin-top: 0;">✅ Configuración Correcta</h3>
        <p style="margin: 0;">Si recibes este email, significa que el servicio de notificaciones está funcionando perfectamente.</p>
      </div>

      <p><strong>Fecha y hora:</strong> ${new Date().toLocaleString('es-CL')}</p>
      <p><strong>Sistema:</strong> Universidad Católica - Gestión de Proyectos</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #374151;">🔧 Configuración SMTP Utilizada</h4>
        <p style="margin: 5px 0; font-family: monospace; font-size: 12px;">Host: ${process.env.SMTP_HOST}</p>
        <p style="margin: 5px 0; font-family: monospace; font-size: 12px;">Puerto: ${process.env.SMTP_PORT}</p>
        <p style="margin: 5px 0; font-family: monospace; font-size: 12px;">Seguro: ${process.env.SMTP_SECURE === 'true' ? 'Sí' : 'No'}</p>
        <p style="margin: 5px 0; font-family: monospace; font-size: 12px;">Autenticación: ${(process.env.SMTP_USER && process.env.SMTP_PASS) ? 'Sí' : 'No'}</p>
        <p style="margin: 5px 0; font-family: monospace; font-size: 12px;">From: ${this.getFromAddress()}</p>
      </div>
    `;

    const mailOptions = {
      from: this.getFromAddress(),
      to: toEmail,
      subject: '🧪 Email de Prueba - Sistema UC',
      html: this.getBaseTemplate(content, 'Email de Prueba')
    };

    return await this.sendEmail(mailOptions);
  }

  // NUEVO: Notificación de requerimiento aprobado
  async notifyRequirementApproved(userEmail, userName, projectCode, projectTitle, stageName, requirementName, adminComments) {
    const stageNames = {
      'formalization': 'Formalización',
      'design': 'Diseño y Validación',
      'delivery': 'Entrega y Configuración',
      'operation': 'Aceptación Operacional',
      'maintenance': 'Operación y Mantenimiento'
    };

    const content = `
      <h2>✅ ¡Requerimiento Aprobado!</h2>
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Te informamos que tu requerimiento ha sido <span class="status-approved">APROBADO</span>.</p>
      
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #166534; margin-top: 0;">📋 Detalles del Requerimiento</h3>
        <p><strong>Proyecto:</strong> ${projectCode} - ${projectTitle}</p>
        <p><strong>Etapa:</strong> ${stageNames[stageName] || stageName}</p>
        <p><strong>Requerimiento:</strong> ${requirementName}</p>
        ${adminComments ? `<p><strong>Comentarios:</strong> ${adminComments}</p>` : ''}
        <p><strong>Fecha de aprobación:</strong> ${new Date().toLocaleString('es-CL')}</p>
      </div>

      <p>🎉 <strong>¡Excelente trabajo!</strong></p>
      <p>Tu documento cumple con todos los requisitos establecidos. Puedes continuar con los siguientes requerimientos de tu proyecto.</p>

      <p style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">
          Ver Estado del Proyecto
        </a>
      </p>
    `;

    const mailOptions = {
      from: this.getFromAddress(),
      to: userEmail,
      subject: `✅ Requerimiento Aprobado: ${requirementName} - ${projectCode}`,
      html: this.getBaseTemplate(content, 'Requerimiento Aprobado')
    };

    return await this.sendEmail(mailOptions);
  }

  // NUEVO: Notificación de requerimiento rechazado
  async notifyRequirementRejected(userEmail, userName, projectCode, projectTitle, stageName, requirementName, adminComments) {
    const stageNames = {
      'formalization': 'Formalización',
      'design': 'Diseño y Validación',
      'delivery': 'Entrega y Configuración',
      'operation': 'Aceptación Operacional',
      'maintenance': 'Operación y Mantenimiento'
    };

    const content = `
      <h2>⚠️ Requerimiento Requiere Revisión</h2>
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Te informamos que tu requerimiento <span class="status-rejected">requiere correcciones</span> antes de poder ser aprobado.</p>
      
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #dc2626; margin-top: 0;">📋 Detalles del Requerimiento</h3>
        <p><strong>Proyecto:</strong> ${projectCode} - ${projectTitle}</p>
        <p><strong>Etapa:</strong> ${stageNames[stageName] || stageName}</p>
        <p><strong>Requerimiento:</strong> ${requirementName}</p>
        <p><strong>Fecha de revisión:</strong> ${new Date().toLocaleString('es-CL')}</p>
      </div>

      ${adminComments ? `
        <div style="background-color: #fffbeb; border: 1px solid #fcd34d; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #d97706; margin-top: 0;">💬 Comentarios del Administrador</h3>
          <p style="color: #92400e; margin: 0;">${adminComments}</p>
        </div>
      ` : ''}

      <p>🔄 <strong>Próximos pasos:</strong></p>
      <ul>
        <li>Revisa cuidadosamente los comentarios del administrador</li>
        <li>Realiza las correcciones necesarias en tu documento</li>
        <li>Sube la nueva versión del documento</li>
        <li>El requerimiento será enviado automáticamente a revisión nuevamente</li>
      </ul>

      <p style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">
          Corregir y Subir Nuevo Documento
        </a>
      </p>
    `;

    const mailOptions = {
      from: this.getFromAddress(),
      to: userEmail,
      subject: `⚠️ Corrección Requerida: ${requirementName} - ${projectCode}`,
      html: this.getBaseTemplate(content, 'Requerimiento Rechazado')
    };

    return await this.sendEmail(mailOptions);
  }

  // Notificación de documento subido (confirmación al usuario)
  async notifyDocumentUploadedConfirmation(userEmail, userName, projectCode, stageName, requirementName, fileName) {
    const stageNames = {
      'formalization': 'Formalización',
      'design': 'Diseño y Validación',
      'delivery': 'Entrega y Configuración',
      'operation': 'Aceptación Operacional',
      'maintenance': 'Operación y Mantenimiento'
    };

    const content = `
      <h2>📤 Documento Subido Exitosamente</h2>
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Te confirmamos que tu documento ha sido subido exitosamente y está siendo procesado.</p>
      
      <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #0369a1; margin-top: 0;">📋 Detalles de la Subida</h3>
        <p><strong>Proyecto:</strong> ${projectCode}</p>
        <p><strong>Etapa:</strong> ${stageNames[stageName] || stageName}</p>
        <p><strong>Requerimiento:</strong> ${requirementName}</p>
        <p><strong>Archivo:</strong> ${fileName}</p>
        <p><strong>Fecha de subida:</strong> ${new Date().toLocaleString('es-CL')}</p>
      </div>

      <p>⏰ <strong>Próximos pasos:</strong></p>
      <ul>
        <li>Tu documento será revisado por el administrador</li>
        <li>Recibirás una notificación cuando el requerimiento sea aprobado o rechazado</li>
        <li>Puedes seguir el progreso en tu dashboard</li>
      </ul>

      <p style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">
          Ver Estado del Proyecto
        </a>
      </p>
    `;

    const mailOptions = {
      from: this.getFromAddress(),
      to: userEmail,
      subject: `📤 Documento Subido: ${requirementName} - ${projectCode}`,
      html: this.getBaseTemplate(content, 'Documento Subido')
    };

    return await this.sendEmail(mailOptions);
  }

  // Notificación al admin de documento subido
  async notifyDocumentUploaded(adminEmail, adminName, userEmail, userName, projectCode, projectTitle, stageName, requirementName, fileName) {
    const stageNames = {
      'formalization': 'Formalización',
      'design': 'Diseño y Validación',
      'delivery': 'Entrega y Configuración',
      'operation': 'Aceptación Operacional',
      'maintenance': 'Operación y Mantenimiento'
    };

    const content = `
      <h2>📄 Nuevo Documento Subido</h2>
      <p>Hola <strong>${adminName}</strong>,</p>
      <p>Se ha subido un nuevo documento que requiere tu revisión.</p>
      
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1d4ed8; margin-top: 0;">📋 Detalles del Documento</h3>
        <p><strong>Usuario:</strong> ${userName} (${userEmail})</p>
        <p><strong>Proyecto:</strong> ${projectCode} - ${projectTitle}</p>
        <p><strong>Etapa:</strong> ${stageNames[stageName] || stageName}</p>
        <p><strong>Requerimiento:</strong> ${requirementName}</p>
        <p><strong>Archivo:</strong> ${fileName}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CL')}</p>
      </div>

      <p style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin" class="button">
          Revisar Documento
        </a>
      </p>
    `;

    const mailOptions = {
      from: this.getFromAddress(),
      to: adminEmail,
      subject: `📄 Nuevo Documento: ${requirementName} - ${projectCode}`,
      html: this.getBaseTemplate(content, 'Nuevo Documento')
    };

    return await this.sendEmail(mailOptions);
  }

  // Métodos de etapas existentes (mantenidos para compatibilidad)
  async notifyStageApproved(userEmail, userName, projectCode, projectTitle, stageName, adminComments) {
    const stageNames = {
      'formalization': 'Formalización',
      'design': 'Diseño y Validación',
      'delivery': 'Entrega y Configuración',
      'operation': 'Aceptación Operacional',
      'maintenance': 'Operación y Mantenimiento'
    };

    const content = `
      <h2>✅ ¡Etapa Aprobada!</h2>
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Te informamos que una etapa de tu proyecto ha sido <span class="status-approved">APROBADA</span>.</p>
      
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #166534; margin-top: 0;">🎉 Etapa Aprobada</h3>
        <p><strong>Proyecto:</strong> ${projectCode} - ${projectTitle}</p>
        <p><strong>Etapa:</strong> ${stageNames[stageName] || stageName}</p>
        <p><strong>Fecha de aprobación:</strong> ${new Date().toLocaleString('es-CL')}</p>
        ${adminComments ? `<p><strong>Comentarios:</strong> ${adminComments}</p>` : ''}
      </div>

      <p style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">
          Ver Estado del Proyecto
        </a>
      </p>
    `;

    const mailOptions = {
      from: this.getFromAddress(),
      to: userEmail,
      subject: `✅ Etapa Aprobada: ${stageNames[stageName]} - ${projectCode}`,
      html: this.getBaseTemplate(content, 'Etapa Aprobada')
    };

    return await this.sendEmail(mailOptions);
  }

  async notifyStageRejected(userEmail, userName, projectCode, projectTitle, stageName, adminComments) {
    const stageNames = {
      'formalization': 'Formalización',
      'design': 'Diseño y Validación',
      'delivery': 'Entrega y Configuración',
      'operation': 'Aceptación Operacional',
      'maintenance': 'Operación y Mantenimiento'
    };

    const content = `
      <h2>⚠️ Etapa Requiere Revisión</h2>
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Te informamos que una etapa de tu proyecto <span class="status-rejected">requiere correcciones</span>.</p>
      
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #dc2626; margin-top: 0;">📋 Etapa Rechazada</h3>
        <p><strong>Proyecto:</strong> ${projectCode} - ${projectTitle}</p>
        <p><strong>Etapa:</strong> ${stageNames[stageName] || stageName}</p>
        <p><strong>Fecha de revisión:</strong> ${new Date().toLocaleString('es-CL')}</p>
        ${adminComments ? `<p><strong>Comentarios:</strong> ${adminComments}</p>` : ''}
      </div>

      <p style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">
          Revisar y Corregir
        </a>
      </p>
    `;

    const mailOptions = {
      from: this.getFromAddress(),
      to: userEmail,
      subject: `⚠️ Corrección Requerida: ${stageNames[stageName]} - ${projectCode}`,
      html: this.getBaseTemplate(content, 'Etapa Rechazada')
    };

    return await this.sendEmail(mailOptions);
  }
}

// Exportar instancia singleton
const emailService = new EmailService();
module.exports = emailService;