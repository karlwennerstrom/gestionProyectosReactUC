# Sistema UC - Frontend React

Aplicación web desarrollada en React para el sistema de gestión de proyectos universitarios con interfaz moderna y responsive.

## 🎯 Características

- **React 18** con Hooks y Context API
- **Tailwind CSS** para diseño responsive
- **React Router v6** con rutas protegidas
- **Autenticación JWT** con Context API
- **Upload de archivos** con drag & drop
- **Notificaciones** en tiempo real
- **Dashboard diferenciado** por roles
- **Diseño responsive** para móviles y desktop

## 🏗️ Arquitectura de Componentes

```
src/
├── components/
│   ├── Admin/                    # Componentes específicos del admin
│   │   ├── ProjectDetailsView.jsx
│   │   └── NotificationSettings.jsx
│   ├── User/                     # Componentes específicos del usuario
│   │   ├── UserProjectDetailsView.jsx
│   │   ├── RequirementUploadModal.jsx
│   │   └── NotificationSettings.jsx
│   └── Common/                   # Componentes compartidos
│       ├── LoadingSpinner.jsx
│       └── ProtectedRoute.jsx
├── context/
│   └── AuthContext.jsx          # Context de autenticación
├── pages/
│   ├── Login.jsx                # Página de login
│   ├── AdminDashboard.jsx       # Dashboard del administrador
│   └── UserDashboard.jsx        # Dashboard del usuario
├── services/
│   └── api.js                   # Servicios de API y utilidades
├── config/
│   └── stageRequirements.js     # Configuración de etapas y requerimientos
└── App.jsx                      # Componente principal
```

## 🚀 Instalación y Configuración

### 1. Prerrequisitos
- Node.js 18+
- NPM o Yarn

### 2. Instalación
```bash
# Instalar dependencias
npm install

# Crear archivo de variables de entorno
cp .env.example .env
```

### 3. Configuración
Editar archivo `.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ADMIN_EMAIL=admin@universidad.cl
```

### 4. Desarrollo
```bash
# Iniciar servidor de desarrollo
npm start

# Acceder a http://localhost:3000
```

## 📦 Dependencias Principales

### Dependencias de Producción
```json
{
  "react": "^18.x.x",
  "react-dom": "^18.x.x",
  "react-router-dom": "^6.x.x",
  "axios": "^1.x.x",
  "react-hot-toast": "^2.x.x",
  "react-dropzone": "^14.x.x"
}
```

### Dependencias de Desarrollo
```json
{
  "tailwindcss": "^3.x.x",
  "@testing-library/react": "^13.x.x",
  "@testing-library/jest-dom": "^5.x.x"
}
```

## 🎨 Diseño y Styling

### Tailwind CSS
La aplicación utiliza Tailwind CSS con configuración personalizada:

```javascript
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',      // Azul principal
        secondary: '#64748b',    // Gris secundario
        success: '#059669',      // Verde éxito
        warning: '#d97706',      // Naranja advertencia
        error: '#dc2626'         // Rojo error
      }
    },
  },
  plugins: [],
}
```

### Responsive Design
Breakpoints utilizados:
- **Mobile**: 320px - 767px
- **Tablet**: 768px - 1023px
- **Desktop**: 1024px+

## 🛡️ Autenticación y Rutas

### Context de Autenticación
```javascript
const AuthContext = createContext({
  user: null,
  token: null,
  loading: false,
  login: () => {},
  logout: () => {},
  isAuthenticated: () => false,
  isAdmin: () => false
});
```

### Rutas Protegidas
```javascript
// Ejemplo de uso
<ProtectedRoute requiredRole="admin">
  <AdminDashboard />
</ProtectedRoute>

<ProtectedRoute>
  <UserDashboard />
</ProtectedRoute>
```

### Navegación Automática
- **Login exitoso**: Redirige según rol
- **Token expirado**: Redirige a login
- **Sin permisos**: Página de error
- **Ruta no encontrada**: Página 404

## 📱 Componentes Principales

### 1. Login Component
- Formulario con validación
- Botones de credenciales de prueba
- Diseño responsive
- Redirección automática

### 2. Admin Dashboard
- Vista general de proyectos
- Estadísticas en cards
- Tabla con filtros
- Modal de detalles de proyecto
- Sistema de notificaciones

### 3. User Dashboard
- Mis proyectos con progreso
- Vista por etapas y requerimientos
- Upload de documentos
- Seguimiento de estados

### 4. Project Details Views
- **Admin**: Revisión y aprobación de etapas
- **User**: Seguimiento y upload de documentos
- Timeline visual de progreso
- Comentarios del administrador

## 🔧 Servicios y API

### API Service
```javascript
// Configuración base
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000
});

// Interceptors automáticos
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Servicios Organizados
```javascript
// Servicios por módulo
export const authService = { login, register, getProfile, ... };
export const projectService = { getAll, create, updateStage, ... };
export const documentService = { upload, download, getByProject, ... };

// Utilidades
export const fileUtils = { downloadFile, formatFileSize, getFileTypeIcon };
export const dateUtils = { formatDate, formatDateTime, timeAgo };
```

## 📤 Upload de Archivos

### React Dropzone
Componente personalizado con:
- Drag & drop interface
- Validación de tipos de archivo
- Preview de archivos
- Progress indicator
- Error handling

```javascript
// Configuración del dropzone
const { getRootProps, getInputProps, isDragActive } = useDropzone({
  onDrop: handleFileDrop,
  accept: getAcceptObject(requirement?.acceptedTypes),
  maxSize: parseSize(requirement?.maxSize),
  multiple: false
});
```

## 🔔 Sistema de Notificaciones

### React Hot Toast
- Notificaciones en tiempo real
- Múltiples tipos (success, error, warning)
- Posición personalizable
- Auto-dismiss configurable

```javascript
// Ejemplos de uso
toast.success('Proyecto creado exitosamente');
toast.error('Error al subir archivo');
toast.loading('Procesando...', { id: 'upload' });
```

## 📊 Estados y Gestión de Datos

### Context API
- **AuthContext**: Gestión de autenticación
- **No se usa Redux**: Aplicación de tamaño medio

### Estados Locales
```javascript
// Hooks utilizados frecuentemente
const [loading, setLoading] = useState(false);
const [data, setData] = useState([]);
const [error, setError] = useState(null);

// Custom hooks para lógica reutilizable
const useApi = (apiCall) => { /* ... */ };
const useAuth = () => useContext(AuthContext);
```

## 🎯 Funcionalidades por Rol

### Usuario
- ✅ Ver mis proyectos
- ✅ Crear nuevos proyectos
- ✅ Subir documentos por requerimiento
- ✅ Ver estado de etapas
- ✅ Recibir notificaciones
- ✅ Ver comentarios del admin

### Administrador
- ✅ Ver todos los proyectos
- ✅ Revisar documentos por etapa
- ✅ Aprobar/rechazar etapas independientemente
- ✅ Agregar comentarios
- ✅ Ver estadísticas del sistema
- ✅ Configurar notificaciones por email

## 🔍 Sistema de Etapas

### 5 Etapas Independientes
```javascript
const stages = [
  'formalization',   // Formalización
  'design',         // Diseño y Validación
  'delivery',       // Entrega y Configuración
  'operation',      // Aceptación Operacional
  'maintenance'     // Operación y Mantenimiento
];
```

### Estados de Etapa
- `pending`: Sin documentos
- `in-progress`: En revisión
- `completed`: Aprobada
- `rejected`: Rechazada

## 📁 Upload por Requerimientos

### Configuración Granular
Cada requerimiento tiene:
- **ID único** para tracking
- **Tipos de archivo** permitidos
- **Tamaño máximo** configurable
- **Descripción** detallada
- **Obligatoriedad** (required/optional)

```javascript
// Ejemplo de configuración
{
  id: 'ficha_formalizacion',
  name: 'Ficha Formalización de Proyecto',
  description: 'Documento oficial de formalización',
  required: true,
  acceptedTypes: ['pdf', 'doc', 'docx'],
  maxSize: '5MB'
}
```

## 🎨 Componentes UI

### Loading States
```javascript
// Spinner para pantalla completa
<LoadingSpinner size="large" text="Cargando..." />

// Spinner inline
<InlineSpinner size="small" />
```

### Modales
- Backdrop con blur
- Responsive en móviles
- Scroll interno cuando necesario
- Cerrar con ESC o click outside

### Cards y Layouts
- Grid responsive
- Hover effects
- Status badges
- Progress bars

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm start              # Servidor dev (puerto 3000)
npm run build          # Build para producción
npm test               # Ejecutar tests
npm run eject          # Eject de Create React App

# Linting y formato
npm run lint           # ESLint
npm run format         # Prettier
```

## 🧪 Testing

### Testing Library
```javascript
// Ejemplo de test
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';
import Login from '../pages/Login';

test('renders login form', () => {
  render(
    <AuthProvider>
      <Login />
    </AuthProvider>
  );
  
  expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
});
```

## 📱 PWA (Opcional)

Configuración básica incluida:
- Manifest.json configurado
- Service Worker (opcional)
- Iconos para instalación
- Offline basic support

## 🔄 Estado de Requerimientos

### Tracking Granular
- ✅ **Por Requerimiento**: Cada documento se trackea individualmente
- 📊 **Progreso Visual**: Barras de progreso por etapa
- 🎯 **Estados Claros**: Completado, pendiente, en revisión
- 📧 **Notificaciones**: Email automático por cambios

### Dashboard Visual
```javascript
// Ejemplo de visualización
{
  stage: 'formalization',
  completed: 3,
  total: 4,
  percentage: 75,
  status: 'in-progress'
}
```

## 🚀 Build y Deployment

### Build de Producción
```bash
npm run build
```

Genera carpeta `build/` con:
- HTML/CSS/JS optimizados
- Assets comprimidos
- Hashes para cache busting
- Sourcemaps para debug

### Variables de Entorno
```env
# Desarrollo
REACT_APP_API_URL=http://localhost:5000/api

# Producción
REACT_APP_API_URL=https://api.universidad.cl/api
```

## 🔧 Configuración Avanzada

### Proxy para Desarrollo
```json
// package.json
{
  "proxy": "http://localhost:5000"
}
```

### Configuración de Tailwind
```javascript
// Clases personalizadas utilizadas
.btn-primary { @apply bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded; }
.card { @apply bg-white rounded-lg shadow p-6; }
.badge { @apply px-2 py-1 text-xs font-medium rounded-full; }
```

## 🚨 Troubleshooting

### Problemas Comunes

1. **CORS Error**
   ```javascript
   // Verificar REACT_APP_API_URL
   // Verificar configuración del backend
   ```

2. **Token Expirado**
   ```javascript
   // Interceptor maneja automáticamente
   // Redirige a login
   ```

3. **Upload Fails**
   ```javascript
   // Verificar tamaño de archivo
   // Verificar tipos permitidos
   // Verificar conectividad
   ```

### Debug Tools
- React Developer Tools
- Redux DevTools (si se usa)
- Network tab para API calls
- Console para logs de desarrollo

---

**Desarrollado para Universidad Católica © 2025**