# Estados y Flujos del Sistema

## Estados de Requerimientos

### PENDIENTE
- **Descripción**: No se ha subido ningún documento
- **Icono**: ⏳
- **Acción del usuario**: Subir documento
- **Color**: Amarillo

### EN REVISIÓN
- **Descripción**: Documento subido, esperando revisión del administrador
- **Icono**: 🔄
- **Acción del usuario**: Esperar respuesta
- **Color**: Azul

### APROBADO
- **Descripción**: Requerimiento cumplido satisfactoriamente
- **Icono**: ✅
- **Acción del usuario**: Ninguna (completado)
- **Color**: Verde

### RECHAZADO
- **Descripción**: Requerimiento requiere correcciones
- **Icono**: ❌
- **Acción del usuario**: Corregir y subir nueva versión
- **Color**: Rojo

## Estados de Etapas

### PENDING
- **Descripción**: Etapa sin documentos o recién iniciada
- **Condición**: Sin documentos subidos
- **Siguiente estado**: IN-PROGRESS

### IN-PROGRESS
- **Descripción**: Etapa con documentos en revisión
- **Condición**: Al menos un documento subido
- **Siguiente estado**: COMPLETED o REJECTED

### COMPLETED
- **Descripción**: Todos los requerimientos de la etapa aprobados
- **Condición**: Todos los requerimientos en estado APROBADO
- **Siguiente estado**: Siguiente etapa

### REJECTED
- **Descripción**: Etapa rechazada, requiere correcciones
- **Condición**: Administrador rechaza la etapa
- **Siguiente estado**: IN-PROGRESS (después de correcciones)

## Estados de Proyectos

### PENDING
- **Descripción**: Proyecto recién creado
- **Condición**: Proyecto creado pero sin documentos

### IN-PROGRESS
- **Descripción**: Proyecto en desarrollo
- **Condición**: Al menos un documento subido

### APPROVED
- **Descripción**: Proyecto completamente aprobado
- **Condición**: Todas las etapas completadas

### REJECTED
- **Descripción**: Proyecto rechazado
- **Condición**: Administrador rechaza el proyecto

## Flujo de Correcciones

### Cuando un requerimiento es rechazado:
1. Usuario recibe email con comentarios del administrador
2. Usuario revisa los comentarios
3. Usuario corrige el documento
4. Usuario sube nueva versión
5. Sistema automáticamente marca como "EN REVISIÓN"
6. Sistema envía notificación al administrador
7. Administrador revisa la corrección
8. Proceso se repite hasta aprobación

### Notificaciones automáticas:
- **Al usuario**: Documento subido, requerimiento aprobado, requerimiento rechazado
- **Al administrador**: Nuevo documento, corrección subida

