# 🎯 TESTING - Plataforma PepsiCo Fleet

## 📋 Pre-requisitos Verificados

Antes de testear, asegúrate de tener:

- ✅ Node.js v18+ instalado
- ✅ MySQL Server corriendo
- ✅ Puerto 5000 (backend) libre
- ✅ Puerto 5173 (frontend) libre

---

## 🚀 PROCEDIMIENTO DE TESTING PASO A PASO

### FASE 1: Setup Inicial (5 minutos)

#### 1. Crear la Base de Datos

```powershell
# Abrir MySQL
mysql -u root -p

# En el prompt de MySQL:
source C:/Users/twfan/OneDrive/Desktop/PepsicoApp/database/schema.sql
source C:/Users/twfan/OneDrive/Desktop/PepsicoApp/database/seeders.sql
exit
```

#### 2. Configurar Backend

```powershell
cd C:\Users\twfan\OneDrive\Desktop\PepsicoApp\backend

# Crear archivo .env
Copy-Item .env.example .env

# Editar .env con tus datos (usar notepad o VS Code)
notepad .env
```

**Configuración mínima del .env:**
```env
# Base de Datos
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pepsico_fleet
DB_USER=root
DB_PASSWORD=TU_PASSWORD_MYSQL

# Server
PORT=5000
JWT_SECRET=mi_secreto_super_seguro_12345

# Twilio (opcional para pruebas iniciales)
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# OpenAI (opcional para pruebas iniciales)
OPENAI_API_KEY=sk-xxx
```

#### 3. Instalar Dependencias del Backend

```powershell
npm install
```

#### 4. Crear Usuarios con Passwords Correctos

```powershell
node scripts/seed-users.js
```

Deberías ver:
```
✅ Conectado a la base de datos
✅ Usuario creado: admin@pepsico.cl
✅ Usuario creado: supervisor@pepsico.cl
...
🎉 Todos los usuarios de prueba están listos!
```

---

### FASE 2: Iniciar Servicios (2 minutos)

#### Terminal 1 - Backend

```powershell
cd C:\Users\twfan\OneDrive\Desktop\PepsicoApp\backend
npm run dev
```

**Resultado esperado:**
```
✅ Conexión a MySQL establecida correctamente
✅ Modelos sincronizados con la base de datos

🚀 ============================================
   Servidor iniciado en puerto 5000
   Entorno: development
   URL: http://localhost:5000
============================================
```

#### Terminal 2 - Frontend

```powershell
cd C:\Users\twfan\OneDrive\Desktop\PepsicoApp\frontend
npm install
npm run dev
```

**Resultado esperado:**
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

### FASE 3: Testing Funcional (10 minutos)

#### TEST 1: API Health Check ✅

```powershell
curl http://localhost:5000/health
```

**Esperado:**
```json
{"status":"OK","timestamp":"2025-10-18T..."}
```

#### TEST 2: Login API ✅

```powershell
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@pepsico.cl\",\"password\":\"password123\"}'
```

**Esperado:**
```json
{
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nombre": "Admin Sistema",
    "email": "admin@pepsico.cl",
    "rol": "admin"
  }
}
```

#### TEST 3: Frontend Login ✅

1. Abrir navegador: `http://localhost:5173`
2. Ingresar credenciales:
   - **Email:** admin@pepsico.cl
   - **Password:** password123
3. Click en "Ingresar"

**Esperado:** Redirección al Dashboard

#### TEST 4: Listar Solicitudes ✅

En el navegador:
1. Ir a **Solicitudes** (menú superior)
2. Deberías ver 3 solicitudes de prueba

#### TEST 5: Webhook de WhatsApp ✅ (Requiere Twilio configurado)

**Opción A: Con ngrok (recomendado)**

```powershell
# Terminal 3
ngrok http 5000
```

Copiar la URL (ej: `https://abc123.ngrok.io`)

En Twilio Console:
1. Ir a: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. Configurar webhook: `https://abc123.ngrok.io/api/webhook/whatsapp`
3. Enviar mensaje de prueba al número de Twilio

**Mensaje de prueba:**
```
Hola, necesito reparación urgente para patente AB-1234.
El motor está haciendo un ruido extraño y no puedo continuar.
```

**Esperado en los logs del backend:**
```
📱 Mensaje de WhatsApp recibido
🤖 Clasificando mensaje con IA...
✅ Solicitud creada: 4
✅ WhatsApp enviado a +56912345678
```

**Opción B: Test Manual del Webhook (sin WhatsApp)**

```powershell
curl -X POST http://localhost:5000/api/webhook/whatsapp `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "From=whatsapp:%2B56912345678&Body=Necesito mantenimiento para AB-1234&NumMedia=0"
```

---

### FASE 4: Verificación de Datos (5 minutos)

#### Verificar en Base de Datos

```sql
-- Contar usuarios
SELECT COUNT(*) as total_usuarios FROM usuarios;

-- Listar solicitudes
SELECT id, descripcion, prioridad, estado FROM solicitudes;

-- Ver clasificaciones IA
SELECT id, tipo, clasificacion_ia FROM solicitudes WHERE clasificacion_ia IS NOT NULL;
```

#### Verificar en Frontend

- Dashboard muestra resumen
- Solicitudes aparecen en tabla
- Badges de prioridad/estado funcionan

---

## 📊 Checklist de Funcionalidades

### Backend ✅
- [x] Servidor Express corriendo
- [x] Conexión MySQL funcional
- [x] Modelos Sequelize sincronizados
- [x] API REST endpoints respondiendo
- [x] Autenticación JWT funcionando
- [x] Webhook de WhatsApp recibiendo mensajes
- [x] Integración OpenAI clasificando solicitudes

### Frontend ✅
- [x] App React cargando
- [x] Login funcional
- [x] Dashboard con navegación
- [x] Listado de solicitudes
- [x] Protección de rutas privadas

### Integraciones 🔄
- [ ] Twilio WhatsApp (requiere configuración)
- [ ] OpenAI API (requiere API key)

---

## 🐛 Troubleshooting Común

### "Cannot connect to MySQL"

```powershell
# Verificar servicio MySQL
Get-Service -Name MySQL*

# Iniciar si está detenido
Start-Service -Name MySQL80
```

### "Error: Cannot find module"

```powershell
# Backend
cd backend
rm -r -fo node_modules
npm install

# Frontend
cd ..\frontend
rm -r -fo node_modules
npm install
```

### "Port 5000 already in use"

```powershell
# Encontrar proceso
netstat -ano | findstr :5000

# Matar proceso (reemplazar PID)
taskkill /PID <numero_pid> /F
```

### "Login no funciona"

```powershell
# Regenerar usuarios con passwords correctos
cd backend
node scripts/seed-users.js
```

---

## 📈 Métricas de Éxito

✅ **Sprint 0 Completo** si:
- Backend responde en puerto 5000
- Frontend carga en puerto 5173
- Login funciona con usuarios de prueba
- Solicitudes se listan correctamente
- Webhook puede recibir POST requests

---

## 🎯 Próximos Pasos (Sprint 1)

1. Implementar panel de Solicitudes completo
2. Agregar filtros y búsqueda
3. Crear formulario de nueva solicitud
4. Mejorar dashboard con estadísticas reales
5. Implementar notificaciones en tiempo real

---

## 📞 Contacto

**Developer:** Fabiano Carte  
**Product Owner:** Martin Silva

**¿Todo funcionando?** ¡Felicitaciones! 🎉  
El Sprint 0 está completo y puedes avanzar al Sprint 1.
