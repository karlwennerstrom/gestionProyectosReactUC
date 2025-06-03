# Integración de Servicios con CAS Universidad Católica

## ¿Qué es CAS?
CAS (Central Authentication Service) es el sistema centralizado de autenticación de la Universidad Católica que permite a los usuarios acceder a múltiples servicios usando una sola cuenta institucional.

## Cuándo necesitas integrar con CAS
- Cuando desarrollas una aplicación web que requiere autenticación UC
- Cuando necesitas verificar identidad de usuarios UC
- Cuando tu servicio debe integrarse con el ecosistema de aplicaciones UC
- Para aplicaciones internas que requieren Single Sign-On (SSO)

## Proceso de Integración con CAS

### Paso 1: Solicitud Inicial
**Contacto principal:** karl.wennerstrom@uc.cl
- Envía un email explicando tu proyecto y necesidad de integración CAS
- Incluye información sobre:
  - Nombre del servicio/aplicación
  - URL del servicio
  - Ambiente (desarrollo, pruebas, producción)
  - Descripción técnica básica

### Paso 2: Información Técnica Requerida
Debes proporcionar:
- **URL del servicio**: Dirección completa donde estará alojado
- **URL de callback**: Endpoint donde CAS enviará la respuesta de autenticación
- **Descripción del servicio**: Qué hace tu aplicación
- **Público objetivo**: Quiénes usarán el servicio (estudiantes, funcionarios, docentes)
- **Nivel de seguridad requerido**: Información que necesitas del usuario

### Paso 3: Configuración Técnica
El equipo de CAS te proporcionará:
- **Service ID**: Identificador único para tu servicio
- **URLs de CAS**: Endpoints para autenticación
- **Documentación técnica**: Cómo implementar la integración
- **Credenciales de prueba**: Para ambiente de desarrollo

### Paso 4: Implementación
- Implementa la integración siguiendo la documentación proporcionada
- Configura tu aplicación con los parámetros recibidos
- Realiza pruebas en ambiente de desarrollo

### Paso 5: Pruebas y Validación
- Prueba el flujo de login completo
- Verifica que los datos del usuario se reciban correctamente
- Valida el logout y manejo de sesiones
- Reporta cualquier problema al equipo CAS

### Paso 6: Paso a Producción
- Solicita configuración para ambiente de producción
- Proporciona URLs finales de producción
- Realiza pruebas finales
- Documenta el proceso para tu equipo

## Información Técnica Básica

### Flujo de Autenticación CAS
1. Usuario accede a tu aplicación
2. Aplicación redirige a CAS UC
3. Usuario se autentica en CAS
4. CAS redirige de vuelta con token de autenticación
5. Tu aplicación valida el token con CAS
6. Usuario queda autenticado en tu aplicación

### Datos que puedes obtener del usuario
- RUT (identificador único)
- Nombre completo
- Email institucional
- Tipo de usuario (estudiante, funcionario, académico)
- Facultad/unidad académica (según corresponda)

### URLs importantes
- **Producción CAS**: https://sso.uc.cl
- **Desarrollo CAS**: Será proporcionado por el equipo
- **Documentación**: Disponible tras solicitar acceso

## Tiempo estimado del proceso
- **Solicitud inicial**: 1-2 días hábiles para respuesta
- **Configuración técnica**: 3-5 días hábiles
- **Implementación**: Depende de tu desarrollo
- **Validación**: 2-3 días hábiles
- **Paso a producción**: 1-2 días hábiles

**Total estimado: 1-2 semanas**

## Consideraciones importantes
- CAS UC soporta protocolos estándar (SAML, CAS Protocol)
- Mantén siempre actualizadas las URLs de tu servicio
- Notifica cambios importantes al equipo CAS
- Documenta bien la integración para mantenimiento futuro

## Contacto para soporte
**Email principal:** karl.wennerstrom@uc.cl
**Asunto sugerido:** "Solicitud integración CAS - [Nombre de tu servicio]"

## Plantilla de email inicial