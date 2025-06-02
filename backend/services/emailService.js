// backend/services/emailService.js - AGREGAR ESTOS MÉTODOS
// Agrega estos métodos al final de la clase EmailService existente

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
      from: `"Sistema UC" <${process.env.SMTP_USER}>`,
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
      from: `"Sistema UC" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `⚠️ Corrección Requerida: ${requirementName} - ${projectCode}`,
      html: this.getBaseTemplate(content, 'Requerimiento Rechazado')
    };

    return await this.sendEmail(mailOptions);
  }

  // ACTUALIZAR: Notificación de documento subido (mejorada para requerimientos)
  async notifyDocumentUploadedForRequirement(adminEmail, adminName, userEmail, userName, projectCode, projectTitle, stageName, requirementName, fileName) {
    const stageNames = {
      'formalization': 'Formalización',
      'design': 'Diseño y Validación',
      'delivery': 'Entrega y Configuración',
      'operation': 'Aceptación Operacional',
      'maintenance': 'Operación y Mantenimiento'
    };

    const content = `
      <h2>📄 Nuevo Documento - Requerimiento Específico</h2>
      <p>Hola <strong>${adminName}</strong>,</p>
      <p>Se ha subido un nuevo documento para un requerimiento específico que requiere tu revisión.</p>
      
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1d4ed8; margin-top: 0;">📋 Detalles del Requerimiento</h3>
        <p><strong>Usuario:</strong> ${userName} (${userEmail})</p>
        <p><strong>Proyecto:</strong> ${projectCode} - ${projectTitle}</p>
        <p><strong>Etapa:</strong> ${stageNames[stageName] || stageName}</p>
        <p><strong>Requerimiento específico:</strong> ${requirementName}</p>
        <p><strong>Archivo:</strong> ${fileName}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CL')}</p>
      </div>

      <p>⏰ <strong>Acción requerida:</strong></p>
      <ul>
        <li>Revisa el documento subido para este requerimiento específico</li>
        <li>Aprueba o rechaza el requerimiento individualmente</li>
        <li>Agrega comentarios específicos si es necesario</li>
        <li>Si todos los requerimientos de la etapa están listos, puedes aprobar la etapa completa</li>
      </ul>

      <p style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin" class="button">
          Revisar Requerimiento Específico
        </a>
      </p>
    `;

    const mailOptions = {
      from: `"Sistema UC" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `📄 Nuevo Documento para Requerimiento: ${requirementName} - ${projectCode}`,
      html: this.getBaseTemplate(content, 'Documento para Requerimiento')
    };

    return await this.sendEmail(mailOptions);
  }

  // NUEVO: Notificación de etapa completada (cuando todos los requerimientos están aprobados)
  async notifyStageCompleted(userEmail, userName, projectCode, projectTitle, stageName, totalRequirements, adminComments) {
    const stageNames = {
      'formalization': 'Formalización',
      'design': 'Diseño y Validación',
      'delivery': 'Entrega y Configuración',
      'operation': 'Aceptación Operacional',
      'maintenance': 'Operación y Mantenimiento'
    };

    const content = `
      <h2>🎉 ¡Etapa Completada!</h2>
      <p>Hola <strong>${userName}</strong>,</p>
      <p>¡Felicitaciones! Todos los requerimientos de una etapa de tu proyecto han sido aprobados.</p>
      
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #166534; margin-top: 0;">🏆 Etapa Completada</h3>
        <p><strong>Proyecto:</strong> ${projectCode} - ${projectTitle}</p>
        <p><strong>Etapa:</strong> ${stageNames[stageName] || stageName}</p>
        <p><strong>Requerimientos aprobados:</strong> ${totalRequirements}/${totalRequirements}</p>
        <p><strong>Fecha de finalización:</strong> ${new Date().toLocaleString('es-CL')}</p>
        ${adminComments ? `<p><strong>Comentarios finales:</strong> ${adminComments}</p>` : ''}
      </div>

      <p>🚀 <strong>¡Excelente progreso!</strong></p>
      <p>Has completado satisfactoriamente todos los requerimientos de esta etapa. Tu proyecto avanza automáticamente a la siguiente fase.</p>

      <p>📋 <strong>Próximos pasos:</strong></p>
      <ul>
        <li>Tu proyecto ha avanzado automáticamente a la siguiente etapa</li>
        <li>Revisa los nuevos requerimientos disponibles</li>
        <li>Prepara la documentación para la siguiente fase</li>
      </ul>

      <p style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="button">
          Ver Siguiente Etapa
        </a>
      </p>
    `;

    const mailOptions = {
      from: `"Sistema UC" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `🎉 Etapa Completada: ${stageNames[stageName]} - ${projectCode}`,
      html: this.getBaseTemplate(content, 'Etapa Completada')
    };

    return await this.sendEmail(mailOptions);
  }

// Cerrar la clase EmailService aquí si estás agregando a un archivo existente