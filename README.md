# Sistema UC - Gestión de Proyectos Multi-Etapa

Sistema web completo para la gestión y aprobación de proyectos universitarios a través de múltiples etapas de validación. Desarrollado para la Universidad Católica.

## 🎯 Características Principales

- **Gestión de Proyectos por Etapas**: Sistema de 5 etapas independientes (Formalización, Diseño, Entrega, Operación, Mantenimiento)
- **Roles de Usuario**: Administrador y Usuario con permisos diferenciados
- **Subida de Documentos**: Upload por requerimientos específicos con validación de tipos de archivo
- **Sistema de Notificaciones**: Emails automáticos para aprobaciones, rechazos y uploads
- **Dashboard Administrativo**: Panel completo para revisión y gestión de etapas
- **Dashboard de Usuario**: Seguimiento de proyectos y progreso por requerimientos
- **Autenticación JWT**: Sistema seguro de autenticación y autorización

## 🏗️ Arquitectura del Sistema

### Frontend (React)
- **Framework**: React 18 con Context API
- **Routing**: React Router v6 con rutas protegidas
- **Styling**: Tailwind CSS
- **State Management**: Context API para autenticación
- **Notificaciones**: React Hot Toast
- **File Upload**: React Dropzone
- **HTTP Client**: Axios con interceptors

### Backend (Node.js)
- **Framework**: Express.js
- **Base de Datos**: MySQL con queries directas
- **Autenticación**: JWT tokens
- **Upload de Archivos**: Multer con validaciones
- **Emails**: Nodemailer con templates HTML
- **Seguridad**: Helmet, CORS, bcrypt
- **Validación**: Express Validator

## 📁 Estructura del Proyecto

```
sistema-uc/
├── frontend/                 # React Application
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   │   ├── Admin/       # Componentes específicos del admin
│   │   │   ├── User/        # Componentes específicos del usuario
│   │   │   └── Common/      # Componentes compartidos
│   │   ├── context/         # Context providers (Auth)
│   │   ├── pages/           # Páginas principales
│   │   ├── services/        # API services y utilidades
│   │   └── config/          # Configuraciones
│   └── public/
├── backend/                 # Node.js API
│   ├── controllers/         # Lógica de controladores
│   ├── models/              # Modelos de datos
│   ├── routes/              # Definición de rutas
│   ├── middleware/          # Middlewares custom
│   ├── services/            # Servicios (email, etc.)
│   ├── config/              # Configuraciones
│   ├── scripts/             # Scripts de utilidad
│   └── uploads/             # Archivos subidos
└── docs/                    # Documentación
```

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- MySQL 8.0+
- NPM o Yarn

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/sistema-uc.git
cd sistema-uc
```

### 2. Configurar Backend
```bash
cd backend
npm install

# Crear archivo .env (ver sección de variables de entorno)
cp .env.example .env

# Ejecutar script de base de datos
mysql -u root -p < scripts/database.sql

# Actualizar contraseñas de usuarios de prueba
npm run update-passwords

# Iniciar servidor de desarrollo
npm run dev
```

### 3. Configurar Frontend
```bash
cd frontend
npm install

# Crear archivo .env
cp .env.example .env

# Iniciar aplicación
npm start
```

## ⚙️ Variables de Entorno

### Backend (.env)
```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=sistema_uc

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui
JWT_EXPIRES_IN=24h

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu_app_password
ADMIN_EMAIL=admin@universidad.cl

# Aplicación
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ADMIN_EMAIL=admin@universidad.cl
```

## 🗃️ Base de Datos

El sistema utiliza MySQL con las siguientes tablas principales:
- `users`: Gestión de usuarios y roles
- `projects`: Proyectos y su estado general
- `project_stages`: Estados independientes por etapa
- `documents`: Archivos subidos por requerimiento

Ejecutar el script SQL incluido para crear la estructura completa con datos de prueba.

## 👥 Usuarios de Prueba

Una vez configurado el sistema, puedes acceder con:

**Administrador:**
- Usuario: `admin`
- Contraseña: `password123`

**Usuario:**
- Usuario: `jperez`
- Contraseña: `password123`

## 🎯 Flujo de Trabajo

### Para Usuarios
1. Crear proyecto con título y descripción
2. Subir documentos por requerimiento específico en cada etapa
3. Los documentos se envían automáticamente a revisión
4. Recibir notificaciones de aprobación/rechazo por email
5. Corregir documentos en etapas rechazadas

### Para Administradores
1. Recibir notificaciones cuando se suban documentos
2. Revisar documentos en el panel de administración
3. Aprobar o rechazar etapas independientemente
4. Agregar comentarios para guiar al usuario
5. Ver estadísticas generales del sistema

## 🔧 Scripts Disponibles

### Backend
```bash
npm start          # Producción
npm run dev        # Desarrollo con nodemon
npm run update-passwords  # Actualizar contraseñas de prueba
```

### Frontend
```bash
npm start          # Desarrollo
npm run build      # Build para producción
npm test           # Ejecutar tests
```

## 📧 Configuración de Email

El sistema envía emails automáticos para:
- Confirmación de upload de documentos
- Notificación de etapas aprobadas
- Notificación de etapas rechazadas
- Alertas al administrador de nuevos documentos

Para Gmail, necesitas:
1. Activar autenticación de 2 pasos
2. Generar una "Contraseña de aplicación"
3. Usar esa contraseña en `SMTP_PASS`

## 🔒 Seguridad

- Autenticación JWT con expiración
- Validación de tipos de archivo en upload
- Middleware de autorización por roles
- Rate limiting por usuario
- Sanitización de inputs con express-validator
- Headers de seguridad con Helmet

## 📱 Responsive Design

La aplicación está completamente optimizada para:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte técnico:
- Email: soporte@universidad.cl
- Issues: [GitHub Issues](https://github.com/tu-usuario/sistema-uc/issues)

## 🏷️ Versiones

- **v1.0.0** - Versión inicial con sistema completo de etapas
- Funcionalidades principales implementadas
- Sistema de notificaciones por email
- Dashboard completo para admin y usuarios

---

**Universidad Católica © 2025** - Sistema de Gestión de Proyectos Multi-Etapa