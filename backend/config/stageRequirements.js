// config/stageRequirements.js - Configuración de requerimientos por etapa

 const stageRequirements = {
  formalization: {
    name: 'Formalización',
    description: 'Validación inicial del proyecto',
    icon: '📋',
    color: 'red',
    requirements: [
      {
        id: 'ficha_formalizacion',
        name: 'Ficha Formalización de Proyecto',
        description: 'Documento oficial de formalización del proyecto',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '5MB'
      },
      {
        id: 'aprobacion_go',
        name: 'Aprobación de Formalización (GO)',
        description: 'Documento de aprobación GO para continuar',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '5MB'
      },
      {
        id: 'codigo_proyecto',
        name: 'Código de proyecto asignado',
        description: 'Asignación oficial del código de proyecto',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '2MB'
      },
      {
        id: 'presupuesto_validado',
        name: 'Presupuesto y Operación validado',
        description: 'Validación de presupuesto y plan operacional',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
        maxSize: '10MB'
      }
    ]
  },
  design: {
    name: 'Diseño y Validación',
    description: 'Validaciones técnicas de diseño',
    icon: '🎨',
    color: 'blue',
    requirements: [
      {
        id: 'requerimientos_tecnicos',
        name: 'Requerimientos Técnicos y Operacionales',
        description: 'Especificación detallada de requerimientos',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '10MB'
      },
      {
        id: 'especificacion_funcional',
        name: 'Documento de especificación funcional',
        description: 'Especificación funcional del sistema',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '15MB'
      },
      {
        id: 'planificacion_definitiva',
        name: 'Planificación Definitiva',
        description: 'Plan definitivo del proyecto',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
        maxSize: '10MB'
      },
      {
        id: 'aprobacion_arquitectura',
        name: 'Aprobación de Arquitectura',
        description: 'Documento de aprobación de arquitectura',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '10MB'
      },
      {
        id: 'aprobacion_infraestructura',
        name: 'Aprobación de Infraestructura',
        description: 'Documento de aprobación de infraestructura',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '10MB'
      },
      {
        id: 'aprobacion_diseno_go',
        name: 'Aprobación de Diseño (GO)',
        description: 'Aprobación final GO para diseño',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '5MB'
      }
    ]
  },
  delivery: {
    name: 'Entrega y Configuración',
    description: 'Validación de entregas y ambientes',
    icon: '🚀',
    color: 'green',
    requirements: [
      {
        id: 'solicitud_ambientes',
        name: 'Ficha Solicitud Creación de Ambientes',
        description: 'Solicitud formal para creación de ambientes',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '5MB'
      },
      {
        id: 'diseno_pruebas',
        name: 'Documento de Diseño y evidencia de pruebas',
        description: 'Diseño detallado y evidencias de pruebas realizadas',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '20MB'
      },
      {
        id: 'politica_datos',
        name: 'Aprobación política tratamiento de datos',
        description: 'Aprobación de políticas de tratamiento de datos',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '5MB'
      },
      {
        id: 'escenarios_prueba',
        name: 'Aprobación Escenarios de Prueba (JCPS)',
        description: 'Aprobación de escenarios de prueba JCPS',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '10MB'
      },
      {
        id: 'aprobacion_ambientes',
        name: 'Aprobación de Ambientes (GO)',
        description: 'Aprobación final GO para ambientes',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '5MB'
      }
    ]
  },
  operation: {
    name: 'Aceptación Operacional',
    description: 'Validación operacional del sistema',
    icon: '⚙️',
    color: 'orange',
    requirements: [
      {
        id: 'documentacion_soporte',
        name: 'Documentación Soporte y Manual de Usuarios',
        description: 'Documentación completa de soporte y manuales',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '25MB'
      },
      {
        id: 'configuraciones_tecnicas',
        name: 'Documento configuraciones técnicas e instalación',
        description: 'Guía de configuraciones técnicas e instalación',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '15MB'
      },
      {
        id: 'diseno_evidencia_pruebas',
        name: 'Documento de Diseño y evidencia de pruebas',
        description: 'Diseño final y evidencias de pruebas completas',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '25MB'
      },
      {
        id: 'plan_produccion',
        name: 'Documento Plan de Puesta en Producción',
        description: 'Plan detallado para puesta en producción',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '10MB'
      },
      {
        id: 'mesa_ayuda',
        name: 'Documentos Mesa de Ayuda',
        description: 'Documentación para mesa de ayuda',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '15MB'
      },
      {
        id: 'evidencia_capacitaciones',
        name: 'Documento Evidencia de Capacitaciones',
        description: 'Evidencias de capacitaciones realizadas',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '20MB'
      },
      {
        id: 'aprobacion_kit_digital',
        name: 'Aprobación uso Kit Digital',
        description: 'Aprobación para uso de kit digital',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '5MB'
      }
    ]
  },
  maintenance: {
    name: 'Operación y Mantenimiento',
    description: 'Marcha blanca y cierre del proyecto',
    icon: '🔧',
    color: 'purple',
    requirements: [
      {
        id: 'backlog_pendientes',
        name: 'Backlog Requerimientos Pendientes',
        description: 'Lista de requerimientos pendientes',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
        maxSize: '10MB'
      },
      {
        id: 'cierre_proyecto',
        name: 'Cierre de Proyecto',
        description: 'Documento formal de cierre de proyecto',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '10MB'
      },
      {
        id: 'aprobacion_cierre_go',
        name: 'Aprobación de Cierre (GO)',
        description: 'Aprobación final GO para cierre',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '5MB'
      },
      {
        id: 'pendientes_implementacion',
        name: 'Pendientes de Implementación',
        description: 'Lista de pendientes de implementación',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
        maxSize: '10MB'
      },
      {
        id: 'documentacion_cierre',
        name: 'Documentación de cierre',
        description: 'Documentación completa de cierre',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '20MB'
      },
      {
        id: 'tareas_operacion',
        name: 'Tareas de Operación',
        description: 'Definición de tareas de operación continua',
        required: true,
        acceptedTypes: ['pdf', 'doc', 'docx'],
        maxSize: '15MB'
      }
    ]
  }
};

module.exports = { stageRequirements };