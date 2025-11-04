# 🚀 GUÍA DE DEPLOY GRATUITO - RENDER.COM
# PepsiCo Fleet Management System

## 📋 Requisitos Previos

- [ ] Cuenta en GitHub (gratis)
- [ ] Cuenta en Render.com (gratis)
- [ ] Cuenta en Vercel.com (gratis)  
- [ ] Cuenta en PlanetScale.com (gratis) - Para MySQL
- [ ] Cuenta en cron-job.org (gratis) - Para mantener servidor despierto

---

## 🗄️ PASO 1: Crear Base de Datos MySQL en PlanetScale

### 1.1 Registrarse en PlanetScale
1. Ve a: https://planetscale.com/
2. Registrarse con GitHub (gratis)
3. Crear nueva organización (opcional)

### 1.2 Crear Base de Datos
```
Nombre: pepsico-fleet-db
Región: AWS us-east-1 (o la más cercana)
Plan: Hobby (GRATIS - 5GB)
```

### 1.3 Crear Branch "main"
- En la BD creada, ve a "Branches"
- Ya debe existir un branch "main" por defecto

### 1.4 Obtener Credenciales de Conexión
1. Click en "Connect"
2. Seleccionar: "Connect with MySQL CLI"
3. Copiar los datos:
   ```
   DB_HOST: xxxx.us-east-1.psdb.cloud
   DB_PORT: 3306
   DB_NAME: pepsico-fleet-db
   DB_USER: xxxxxxxxxxxx
   DB_PASSWORD: pscale_pw_xxxxxxxxxxxx
   ```
4. Guardar estos datos (los necesitarás después)

### 1.5 Importar Schema y Datos

**Opción A: Desde tu MySQL Local**
```bash
# 1. Exportar desde MySQL local
mysqldump -u root -p pepsico_fleet > backup.sql

# 2. Instalar PlanetScale CLI
# Windows: scoop install planetscale
# Mac: brew install planetscale/tap/pscale

# 3. Conectarse a PlanetScale
pscale auth login

# 4. Crear shell de conexión
pscale shell pepsico-fleet-db main

# 5. En el shell, ejecutar el backup
mysql> source backup.sql;
```

**Opción B: Ejecutar Migraciones Manualmente**
```bash
# Conectarse a PlanetScale
pscale shell pepsico-fleet-db main

# Copiar y pegar el contenido de estos archivos:
# 1. database/schema.sql
# 2. database/seeders.sql
# 3. database/migration_agendamiento.sql
```

---

## 🔧 PASO 2: Preparar Código para Deploy

### 2.1 Verificar que tengas estos archivos:
- [x] `render.yaml` (creado automáticamente)
- [x] `backend/package.json`
- [x] `backend/server.js`
- [x] `backend/.env` (NO subir a Git)

### 2.2 Actualizar .gitignore
```bash
# Verificar que esto esté en .gitignore
node_modules/
.env
.env.local
.env.production
*.log
uploads/
```

### 2.3 Commit y Push a GitHub
```bash
git add .
git commit -m "Preparar para deploy en Render"
git push origin feature/pepsicoapp
```

---

## 🌐 PASO 3: Deploy Backend en Render

### 3.1 Crear Cuenta en Render
1. Ve a: https://render.com/
2. "Get Started for Free"
3. Conectar con GitHub

### 3.2 Crear Web Service
1. Dashboard → "New" → "Blueprint"
2. Conectar tu repositorio: `2025_2_PO_CAPSTONE_003D_GRUPO_1`
3. Render detectará automáticamente el `render.yaml`
4. Click "Apply"

### 3.3 Configurar Variables de Entorno
Una vez creado el servicio:
1. Ve a "Environment" en el dashboard del servicio
2. Agregar las siguientes variables (las que están en tu `.env` local):

```bash
# Base de Datos (de PlanetScale)
DB_HOST=xxxx.us-east-1.psdb.cloud
DB_PORT=3306
DB_NAME=pepsico-fleet-db
DB_USER=tu_usuario_planetscale
DB_PASSWORD=pscale_pw_xxxxxxxxxxxx

# JWT (Render ya generó JWT_SECRET automáticamente)

# Twilio (copiar de tu .env local)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# OpenAI (copiar de tu .env local)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx

# URLs (ajustar después del deploy)
FRONTEND_URL=https://pepsico-fleet.vercel.app
WEBHOOK_BASE_URL=https://pepsico-fleet-backend.onrender.com
```

3. Click "Save Changes"
4. El servicio se redesplegará automáticamente

### 3.4 Obtener URL del Backend
Después del deploy exitoso:
```
URL: https://pepsico-fleet-backend.onrender.com
Health Check: https://pepsico-fleet-backend.onrender.com/health
```

---

## 🎨 PASO 4: Deploy Frontend en Vercel

### 4.1 Crear Cuenta en Vercel
1. Ve a: https://vercel.com/
2. "Sign Up" con GitHub
3. Autorizar acceso al repositorio

### 4.2 Crear Nuevo Proyecto
1. "Add New..." → "Project"
2. Import tu repositorio: `2025_2_PO_CAPSTONE_003D_GRUPO_1`
3. Configurar:
   ```
   Framework Preset: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

### 4.3 Configurar Variables de Entorno
En la sección "Environment Variables":
```
VITE_API_URL=https://pepsico-fleet-backend.onrender.com/api
```

### 4.4 Deploy
1. Click "Deploy"
2. Esperar ~2 minutos
3. Obtener URL: `https://pepsico-fleet.vercel.app`

---

## 📱 PASO 5: Actualizar Twilio Webhook

### 5.1 Ir a Twilio Console
1. https://console.twilio.com/
2. Messaging → Try it out → Send a WhatsApp message

### 5.2 Actualizar Webhook URL
```
Antigua: https://xxxxxxx.ngrok-free.app/api/webhook/whatsapp
Nueva:   https://pepsico-fleet-backend.onrender.com/api/webhook/whatsapp
```

### 5.3 Probar
Envía un mensaje de prueba desde WhatsApp:
```
Hola
```

Deberías recibir la respuesta del bot.

---

## ⏰ PASO 6: Configurar Keep-Alive (Opcional pero Recomendado)

### 6.1 Registrarse en cron-job.org
1. Ve a: https://cron-job.org/
2. "Sign Up" (gratis)

### 6.2 Crear Cron Job
```
Title: PepsiCo Fleet Keep-Alive
URL: https://pepsico-fleet-backend.onrender.com/health
Schedule: */14 * * * * (cada 14 minutos)
Request Method: GET
Enable: ✅
```

### 6.3 Verificar
- El servidor ya no se dormirá
- Siempre responderá en <2 segundos

---

## ✅ PASO 7: Verificación Final

### 7.1 Checklist de Testing
```bash
# Backend
✅ https://pepsico-fleet-backend.onrender.com/health
✅ https://pepsico-fleet-backend.onrender.com/api/auth/login (POST)

# Frontend
✅ https://pepsico-fleet.vercel.app
✅ Login funciona
✅ Dashboard carga

# WhatsApp
✅ Enviar mensaje al sandbox
✅ Recibir respuesta del bot
✅ Crear solicitud
✅ Recibir notificación

# Agendamiento
✅ Aprobar solicitud
✅ Se crea cita automáticamente
✅ Vista en calendario funciona
```

### 7.2 Monitorear Logs
- **Render**: Dashboard → Logs (tiempo real)
- **Vercel**: Deployments → Function Logs

---

## 🎉 ¡LISTO!

Tu aplicación está desplegada GRATIS en:

```
Backend:  https://pepsico-fleet-backend.onrender.com
Frontend: https://pepsico-fleet.vercel.app
Database: PlanetScale (5GB gratis)
Keep-Alive: cron-job.org (ping cada 14 min)

COSTO TOTAL: $0 USD/mes
```

---

## 🆘 Troubleshooting

### Error: Base de datos no conecta
```bash
# Verificar que las credenciales sean correctas en Render
# Probar conexión desde terminal:
mysql -h [DB_HOST] -u [DB_USER] -p[DB_PASSWORD] [DB_NAME]
```

### Error: Servidor responde con 502
```bash
# Esperar 30-60 segundos (está despertando)
# Si persiste, revisar logs en Render Dashboard
```

### Error: CORS en frontend
```bash
# Verificar que FRONTEND_URL en backend tenga la URL correcta de Vercel
# Ejemplo: https://pepsico-fleet.vercel.app (sin / al final)
```

### Error: Webhook de Twilio no funciona
```bash
# Verificar URL en Twilio Console
# Debe ser: https://[tu-app].onrender.com/api/webhook/whatsapp
# Probar con curl:
curl -X POST https://[tu-app].onrender.com/api/webhook/whatsapp
```

---

## 📚 Recursos Adicionales

- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [PlanetScale Docs](https://planetscale.com/docs)
- [Twilio WhatsApp Sandbox](https://www.twilio.com/docs/whatsapp/sandbox)

---

## 🔄 Actualizar Deploy

Cuando hagas cambios en el código:

```bash
# 1. Commit y push
git add .
git commit -m "Actualización: [descripción]"
git push origin feature/pepsicoapp

# 2. Render y Vercel se redesplegarán automáticamente
# 3. Esperar ~2-3 minutos
# 4. Verificar que todo funcione
```

---

**¿Necesitas ayuda?** Revisa los logs en Render Dashboard → Logs
