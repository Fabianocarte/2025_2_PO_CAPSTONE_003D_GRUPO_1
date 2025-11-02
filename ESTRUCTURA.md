# 📁 Estructura del Proyecto PepsiCo Fleet Management

```
PepsicoApp/
│
├── 📄 README.md                    # Documentación principal
├── 📄 INICIO_RAPIDO.md             # Guía de setup rápido
├── 📄 TESTING.md                   # Procedimientos de testing
├── 📄 .gitignore                   # Archivos excluidos de Git
│
├── 📂 database/                    # Scripts de base de datos
│   ├── schema.sql                  # Estructura completa de tablas
│   ├── seeders.sql                 # Datos de prueba
│   └── update_passwords.sql        # Actualizar passwords
│
├── 📂 backend/                     # Servidor Node.js + Express
│   ├── 📄 package.json             # Dependencias y scripts
│   ├── 📄 server.js                # Punto de entrada del servidor
│   ├── 📄 .env.example             # Template de variables de entorno
│   ├── 📄 .env                     # Variables de entorno (no en Git)
│   │
│   ├── 📂 src/
│   │   │
│   │   ├── 📂 config/              # Configuraciones
│   │   │   ├── database.js         # Conexión Sequelize a MySQL
│   │   │   └── twilio.js           # Cliente Twilio WhatsApp
│   │   │
│   │   ├── 📂 models/              # Modelos de datos (Sequelize ORM)
│   │   │   ├── index.js            # Exporta todos los modelos y relaciones
│   │   │   ├── Usuario.js          # Modelo de usuarios (chofer, supervisor, mecanico, admin)
│   │   │   ├── Vehiculo.js         # Modelo de vehículos de flota
│   │   │   ├── Solicitud.js        # Solicitudes de mantenimiento
│   │   │   └── OrdenTrabajo.js     # Órdenes de trabajo (OT)
│   │   │
│   │   ├── 📂 controllers/         # Lógica de negocio
│   │   │   ├── auth.controller.js          # Login, registro, perfil
│   │   │   ├── solicitudes.controller.js   # CRUD de solicitudes
│   │   │   ├── ordenes.controller.js       # CRUD de OT
│   │   │   ├── vehiculos.controller.js     # Gestión de vehículos
│   │   │   ├── usuarios.controller.js      # Gestión de usuarios
│   │   │   └── webhook.controller.js       # Webhook de WhatsApp
│   │   │
│   │   ├── 📂 routes/              # Definición de endpoints API
│   │   │   ├── auth.routes.js
│   │   │   ├── solicitudes.routes.js
│   │   │   ├── ordenes.routes.js
│   │   │   ├── vehiculos.routes.js
│   │   │   ├── usuarios.routes.js
│   │   │   └── webhook.routes.js
│   │   │
│   │   ├── 📂 middleware/          # Middlewares personalizados
│   │   │   └── auth.js             # Verificación de JWT y roles
│   │   │
│   │   ├── 📂 services/            # Servicios externos e IA
│   │   │   └── aiClassifier.js     # Clasificación con OpenAI GPT-4
│   │   │
│   │   └── 📂 utils/               # Funciones auxiliares
│   │       └── (helpers futuros)
│   │
│   ├── 📂 scripts/                 # Scripts de utilidad
│   │   └── seed-users.js           # Crear usuarios de prueba
│   │
│   └── 📂 uploads/                 # Archivos subidos
│       └── .gitkeep
│
└── 📂 frontend/                    # Aplicación React
    ├── 📄 package.json             # Dependencias frontend
    ├── 📄 vite.config.js           # Configuración Vite
    ├── 📄 index.html               # HTML base
    │
    └── 📂 src/
        ├── 📄 main.jsx             # Punto de entrada React
        ├── 📄 App.jsx              # Componente raíz con rutas
        ├── 📄 index.css            # Estilos globales
        │
        ├── 📂 pages/               # Vistas principales
        │   ├── Login.jsx           # Página de login
        │   ├── Login.css
        │   ├── Dashboard.jsx       # Panel principal
        │   ├── Dashboard.css
        │   ├── Solicitudes.jsx     # Lista de solicitudes
        │   ├── Ordenes.jsx         # Lista de OT (placeholder)
        │   └── Vehiculos.jsx       # Gestión de vehículos (placeholder)
        │
        ├── 📂 components/          # Componentes reutilizables (futuros)
        │   └── (componentes compartidos)
        │
        ├── 📂 services/            # Servicios API
        │   └── api.js              # Cliente Axios configurado
        │
        └── 📂 context/             # Estado global
            └── AuthContext.jsx     # Context de autenticación
```

---

## 🗂️ Descripción de Carpetas Clave

### Backend

#### `/src/config/`
Configuraciones de conexiones externas:
- **database.js:** Sequelize conectado a MySQL
- **twilio.js:** Cliente para enviar/recibir WhatsApp

#### `/src/models/`
Modelos de datos que representan las tablas SQL:
- Definen estructura, validaciones y relaciones
- Hooks para hashear passwords automáticamente

#### `/src/controllers/`
Lógica de negocio de cada módulo:
- Reciben requests HTTP
- Validan datos
- Interactúan con modelos
- Retornan responses JSON

#### `/src/routes/`
Definición de endpoints:
- Mapean URLs a funciones de controllers
- Aplican middlewares (auth, validación)

#### `/src/services/`
Integraciones con servicios externos:
- **aiClassifier.js:** Usa OpenAI GPT-4 para clasificar solicitudes automáticamente

### Frontend

#### `/src/pages/`
Vistas completas de la aplicación:
- Una por ruta principal
- Incluyen lógica de carga de datos

#### `/src/context/`
Estado global compartido:
- **AuthContext:** Gestiona sesión de usuario

#### `/src/services/`
Comunicación con backend:
- **api.js:** Axios con interceptors para agregar token JWT

---

## 📊 Flujo de Datos Principal

### 1. Mensaje por WhatsApp → Sistema

```
Chofer (WhatsApp)
    ↓
Twilio API
    ↓
POST /api/webhook/whatsapp (webhook.controller.js)
    ↓
aiClassifier.js (OpenAI GPT-4)
    ↓
Solicitud.create() (Modelo Sequelize)
    ↓
MySQL Database
    ↓
sendWhatsAppMessage() (respuesta automática)
```

### 2. Supervisor Revisa Solicitud → Crea OT

```
Frontend (Solicitudes.jsx)
    ↓
GET /api/solicitudes (solicitudes.controller.js)
    ↓
Solicitud.findAll() + include Usuario, Vehiculo
    ↓
Response JSON al frontend
    ↓
Supervisor aprueba → POST /api/ordenes
    ↓
OrdenTrabajo.create()
    ↓
Notificación WhatsApp al mecánico
```

### 3. Mecánico Completa Trabajo

```
Frontend (Ordenes.jsx)
    ↓
PUT /api/ordenes/:id (ordenes.controller.js)
    ↓
OrdenTrabajo.update({ estado: 'completada' })
    ↓
Solicitud.update({ estado: 'completada' })
    ↓
Notificación WhatsApp al chofer
```

---

## 🔐 Sistema de Autenticación

### Login Flow

```
1. Usuario envía email + password
2. Backend busca usuario en DB
3. bcrypt.compare() valida password
4. jwt.sign() genera token
5. Token guardado en localStorage
6. Todas las requests incluyen token en header Authorization
7. Middleware verificarToken() valida en cada request
```

### Protección de Rutas

```javascript
// Backend
router.get('/solicitudes', verificarToken, verificarRol('supervisor', 'admin'), controller)

// Frontend
<PrivateRoute>
  <Dashboard />
</PrivateRoute>
```

---

## 🎨 Convenciones de Código

### Backend
- **Controladores:** Funciones async/await
- **Modelos:** PascalCase (Usuario, Vehiculo)
- **Rutas:** kebab-case (/api/ordenes-trabajo)
- **Variables:** camelCase

### Frontend
- **Componentes:** PascalCase (Login.jsx, Dashboard.jsx)
- **Hooks:** use prefix (useAuth, useState)
- **Estilos:** Archivos .css junto a componentes
- **API calls:** Centralizados en /services/api.js

---

## 📦 Dependencias Principales

### Backend
```json
{
  "express": "Framework web",
  "sequelize": "ORM para MySQL",
  "mysql2": "Driver MySQL",
  "bcrypt": "Hasheo de passwords",
  "jsonwebtoken": "Autenticación JWT",
  "twilio": "WhatsApp Business API",
  "openai": "GPT-4 para IA",
  "multer": "Upload de archivos"
}
```

### Frontend
```json
{
  "react": "UI Library",
  "react-router-dom": "Navegación",
  "axios": "HTTP client",
  "chart.js": "Gráficos (futuro)"
}
```

---

## 🚀 Scripts Disponibles

### Backend
```bash
npm run dev      # Desarrollo con nodemon (hot reload)
npm start        # Producción
npm test         # Tests (futuro)
```

### Frontend
```bash
npm run dev      # Servidor desarrollo Vite
npm run build    # Build para producción
npm run preview  # Preview del build
```

---

## 📝 Notas Importantes

1. **No subir .env a Git:** Contiene credenciales sensibles
2. **Passwords hasheados:** Nunca almacenar en texto plano
3. **JWT en localStorage:** Considerar seguridad XSS
4. **Validar inputs:** Siempre en backend, frontend es opcional
5. **CORS configurado:** Solo permite origen del frontend
6. **Rate limiting:** Protección contra ataques de fuerza bruta

---

**Última actualización:** Sprint 0 - Octubre 2025  
**Próxima revisión:** Sprint 1 - Implementación completa de Solicitudes
