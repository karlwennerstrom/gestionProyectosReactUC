# Sistema UC - Backend API

API REST desarrollada en Node.js/Express para el sistema de gestión de proyectos universitarios con aprobaciones multi-etapa.

## 🎯 Características

- **API RESTful** con endpoints organizados por módulos
- **Autenticación JWT** con roles diferenciados
- **Upload de archivos** con validaciones y almacenamiento local
- **Sistema de notificaciones** por email con templates HTML
- **Base de datos MySQL** con queries optimizadas
- **Middleware de seguridad** y validación
- **Logging** de requests autenticados
- **Rate limiting** por usuario

## 🏗️ Arquitectura

```
backend/
├── controllers/         # Lógica de negocio
│   ├── authController.js
│   ├── projectController.js
│   └── documentController.js
├── models/              # Modelos de datos
│   ├── User.js
│   ├── Project.js
│   └── Document.js
├── routes/              # Definición de rutas
│   ├── auth.js
│   ├── projects.js
│   ├── documents.js
│   └── email.js
├── middleware/          # Middlewares personalizados
│   └── auth.js
├── services/            # Servicios externos
│   └── emailService.js
├── config/              # Configuraciones
│   ├── database.js
│   └── stageRequirements.js
├── scripts/             # Scripts de utilidad
│   └── updatePasswords.js
├── uploads/             # Archivos subidos
└── server.js           # Entrada principal
```

## 🚀 Instalación

### 1. Prerrequisitos
- Node.js 18+
- MySQL 8.0+
- NPM

### 2. Instalación de dependencias
```bash
npm install
```

### 3. Configuración de entorno
```bash
cp .env.example .env
# Editar .env con tus valores
```

### 4. Base de datos
```bash
# Crear base de datos y tablas
mysql -u root -p < scripts/database.sql

# Actualizar contraseñas de usuarios de prueba
npm run update-passwords
```

### 5. Iniciar servidor
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## ⚙️ Variables de Entorno

Crear archivo `.env` con:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=sistema_uc

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui_minimo_32_caracteres
JWT_EXPIRES_IN=24h

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu_app_password_de_gmail
ADMIN_EMAIL=admin@universidad.cl

# Servidor
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## 📡 API Endpoints

### Autenticación (`/api/auth`)
```http
POST   /login              # Iniciar sesión
POST   /register           # Registrar usuario
GET    /profile            # Obtener perfil
PUT    /profile            # Actualizar perfil
PUT    /change-password    # Cambiar contraseña
GET    /verify             # Verificar token
POST   /logout             # Cerrar sesión
GET    /health             # Estado del módulo
```

### Proyectos (`/api/projects`)
```http
GET    /                   # Listar proyectos
GET    /my                 # Mis proyectos
GET    /:id                # Obtener proyecto
POST   /                   # Crear proyecto
PUT    /:id/status         # Actualizar estado (admin)
PUT    /:id/stage          # Actualizar etapa (admin)
POST   /:id/next-stage     # Mover a siguiente etapa (admin)
DELETE /:id                # Eliminar proyecto
GET    /stats              # Estadísticas (admin)
GET    /health             # Estado del módulo
```

### Documentos (`/api/documents`)
```http
POST   /upload             # Subir documento
GET    /my                 # Mis documentos
GET    /project/:id        # Documentos por proyecto
GET    /:id                # Obtener documento
GET    /:id/download       # Descargar documento
DELETE /:id                # Eliminar documento
GET    /search             # Buscar documentos
GET    /stats              # Estadísticas (admin)
GET    /health             # Estado del módulo
```

### Email (`/api/email`)
```http
POST   /test               # Enviar email de prueba
```

## 🔐 Autenticación y Autorización

### JWT Tokens
- Tokens con expiración configurable (24h por defecto)
- Incluye información del usuario (id, username, role)
- Middleware de verificación automática

### Roles y Permisos
```javascript
// Roles disponibles
const roles = {
  admin: 'admin',    // Acceso completo
  user: 'user'       // Acceso limitado a sus recursos
};

// Middlewares de autorización
authenticateToken    // Verificar token válido
requireAdmin        // Solo administradores
requireOwnership    // Solo dueño del recurso o admin
optionalAuth        // Autenticación opcional
```

## 📁 Upload de Archivos

### Configuración
- **Almacenamiento**: Local en `/uploads`
- **Tamaño máximo**: 10MB
- **Tipos permitidos**: PDF, Word, Excel, PowerPoint, imágenes, texto
- **Nombres únicos**: UUID + extensión original

### Validaciones
```javascript
// Tipos MIME permitidos
const allowedTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // ... más tipos
];
```

## 📧 Sistema de Email

### Configuración SMTP
El sistema utiliza Nodemailer con soporte para:
- Gmail (configuración por defecto)
- Otros proveedores SMTP
- Templates HTML responsivos

### Tipos de notificaciones
1. **Confirmación de upload** (Usuario)
2. **Documento subido** (Admin)
3. **Etapa aprobada** (Usuario)
4. **Etapa rechazada** (Usuario)
5. **Email de prueba** (Ambos)

### Configuración Gmail
1. Activar autenticación de 2 pasos
2. Generar "Contraseña de aplicación"
3. Usar en variable `SMTP_PASS`

## 🗃️ Base de Datos

### Modelo de Datos
```sql
-- Usuarios
users (id, username, email, password, full_name, role, created_at, updated_at)

-- Proyectos
projects (id, code, title, description, user_id, status, current_stage, created_at, updated_at)

-- Etapas de proyectos
project_stages (id, project_id, stage_name, status, admin_comments, completed_at)

-- Documentos
documents (id, project_id, stage_name, requirement_id, file_name, original_name, file_path, file_size, mime_type, uploaded_by, uploaded_at)
```

### Pool de Conexiones
```javascript
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  charset: 'utf8mb4'
});
```

## 🔧 Scripts Disponibles

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "update-passwords": "node scripts/updatePasswords.js"
  }
}
```

## 🛡️ Seguridad

### Middlewares de Seguridad
- **Helmet**: Headers de seguridad HTTP
- **CORS**: Configuración cross-origin
- **Express Validator**: Validación de inputs
- **bcrypt**: Hash de contraseñas
- **Rate Limiting**: Límite de requests por usuario

### Validaciones
```javascript
// Ejemplo de validación de proyecto
const createProjectValidation = [
  body('title')
    .trim()
    .notEmpty()
    .isLength({ min: 5, max: 200 }),
  body('description')
    .trim()
    .notEmpty()
    .isLength({ min: 10, max: 1000 })
];
```

## 📊 Logging y Monitoreo

### Request Logging
```javascript
// Middleware de logging para requests autenticados
const logAuthenticatedRequest = (req, res, next) => {
  if (req.user) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Usuario: ${req.user.username} (${req.user.role})`);
  }
  next();
};
```

### Health Checks
Endpoints `/health` en cada módulo para monitoreo:
```javascript
GET /api/auth/health      # Estado de autenticación
GET /api/projects/health  # Estado de proyectos
GET /api/documents/health # Estado de documentos
```

## 🚦 Rate Limiting

Implementación básica por usuario:
```javascript
const rateLimitByUser = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  // Limitar requests por usuario autenticado
  // 100 requests por 15 minutos por defecto
};
```

## 🔄 Estados del Sistema

### Estados de Proyecto
- `pending`: Proyecto creado, esperando documentos
- `in-progress`: En proceso de revisión
- `approved`: Completamente aprobado
- `rejected`: Rechazado por el admin

### Estados de Etapa
- `pending`: Sin documentos o esperando revisión
- `in-progress`: Documentos subidos, en revisión
- `completed`: Etapa aprobada
- `rejected`: Etapa rechazada, requiere corrección

## 🧪 Testing

### Usuarios de Prueba
Después de ejecutar `npm run update-passwords`:

```javascript
// Administrador
{
  username: 'admin',
  password: 'password123',
  role: 'admin'
}

// Usuario
{
  username: 'jperez',
  password: 'password123', 
  role: 'user'
}
```

### Endpoints de Prueba
```bash
# Test de conectividad
curl http://localhost:5000/api/health

# Test de login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# Test de email
curl -X POST http://localhost:5000/api/email/test \
  -H "Authorization: Bearer tu_token" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## 🚨 Troubleshooting

### Problemas Comunes

1. **Error de conexión a BD**
   ```bash
   # Verificar variables de entorno
   # Verificar que MySQL esté corriendo
   # Verificar permisos de usuario
   ```

2. **Error de email**
   ```bash
   # Verificar configuración SMTP
   # Verificar app password de Gmail
   # Verificar conectividad
   ```

3. **Error de upload**
   ```bash
   # Verificar permisos de directorio uploads/
   # Verificar tamaño de archivo
   # Verificar tipos permitidos
   ```

### Logs de Debug
```bash
# Activar logs detallados
NODE_ENV=development npm run dev
```

## 🔄 Actualizaciones

### Migración de BD
Para cambios en la estructura:
```sql
-- Ejemplo de migración
ALTER TABLE projects ADD COLUMN new_field VARCHAR(255);
```

### Actualización de Dependencias
```bash
npm audit               # Verificar vulnerabilidades
npm update             # Actualizar dependencias
npm audit fix          # Corregir vulnerabilidades
```

---

**Desarrollado para Universidad Católica © 2025**