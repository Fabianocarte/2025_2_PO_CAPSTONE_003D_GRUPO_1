# 🚀 GUÍA DE INICIO RÁPIDO - PepsiCo Fleet Management

## ⚡ Setup en 5 Pasos

### 1️⃣ Instalar Dependencias del Backend

```powershell
cd backend
npm install
```

### 2️⃣ Configurar Variables de Entorno

```powershell
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env y configurar:
# - Credenciales MySQL
# - JWT_SECRET (generar uno seguro)
# - API Keys de Twilio y OpenAI
```

### 3️⃣ Crear Base de Datos

```powershell
# Conectar a MySQL y ejecutar:
mysql -u root -p < ../database/schema.sql
mysql -u root -p pepsico_fleet < ../database/seeders.sql
```

### 4️⃣ Iniciar Backend

```powershell
npm run dev
```

El servidor estará en: `http://localhost:5000`

### 5️⃣ Iniciar Frontend (nueva terminal)

```powershell
cd ..\frontend
npm install
npm run dev
```

La app estará en: `http://localhost:5173`

---

## 🧪 Pruebas Iniciales

### 1. Probar Login

Acceder a: `http://localhost:5173/login`

**Credenciales de prueba:**
- **Admin:** admin@pepsico.cl / password123
- **Supervisor:** supervisor@pepsico.cl / password123
- **Mecánico:** mecanico@pepsico.cl / password123

### 2. Probar API Directamente

```powershell
# Health check
curl http://localhost:5000/health

# Login
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@pepsico.cl\",\"password\":\"password123\"}'

# Listar solicitudes (usar el token del login)
curl http://localhost:5000/api/solicitudes `
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

---

## 📱 Configurar Webhook de WhatsApp

### Paso 1: Exponer servidor local con ngrok

```powershell
# Instalar ngrok: https://ngrok.com/download
ngrok http 5000
```

Copiar la URL generada (ejemplo: `https://abc123.ngrok.io`)

### Paso 2: Configurar Twilio

1. Ir a: https://console.twilio.com/
2. Seleccionar **Messaging** → **Try it out** → **Send a WhatsApp message**
3. En **Sandbox Settings**, configurar:
   - **When a message comes in:** `https://tu-url.ngrok.io/api/webhook/whatsapp`

### Paso 3: Probar enviando mensaje

Enviar por WhatsApp al número de Twilio:

```
Hola, necesito mantenimiento para patente AB-1234.
El motor hace un ruido extraño.
```

El sistema debería:
- ✅ Recibir el mensaje
- 🤖 Clasificarlo con IA
- 💾 Crear solicitud en la BD
- 📱 Responder automáticamente

---

## 🔍 Verificar que Todo Funciona

### Backend Logs

Deberías ver:
```
✅ Conexión a MySQL establecida correctamente
✅ Modelos sincronizados con la base de datos
🚀 Servidor iniciado en puerto 5000
```

### Frontend

- Login funcional
- Dashboard cargando
- Listado de solicitudes con datos de prueba

### Webhook WhatsApp

Al enviar mensaje:
```
📱 Mensaje de WhatsApp recibido
🤖 Clasificando mensaje con IA...
✅ Solicitud creada: 4
✅ WhatsApp enviado a +56912345678
```

---

## 🐛 Troubleshooting

### Error: "ECONNREFUSED MySQL"

```powershell
# Verificar que MySQL esté corriendo
Get-Service -Name MySQL80

# Iniciar MySQL
Start-Service -Name MySQL80
```

### Error: "JWT_SECRET not defined"

```powershell
# Asegurar que .env tiene:
JWT_SECRET=algun_secreto_super_seguro_aqui
```

### Error: "Cannot find module"

```powershell
# Reinstalar dependencias
rm -r node_modules
npm install
```

### Frontend no conecta con Backend

Verificar en `frontend/vite.config.js`:
```js
proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true
  }
}
```

---

## 📊 Siguientes Pasos

1. ✅ **SPRINT 0 COMPLETADO** - Estructura base funcional
2. 🔄 **Siguiente:** Implementar panel de Solicitudes completo (Sprint 1)
3. 🔄 **Siguiente:** Módulo de Órdenes de Trabajo (Sprint 2)
4. 🔄 **Siguiente:** Reportes y Dashboards (Sprint 3)

---

## 📚 Recursos

- **Documentación Twilio:** https://www.twilio.com/docs/whatsapp
- **OpenAI API:** https://platform.openai.com/docs
- **Sequelize:** https://sequelize.org/docs/v6/
- **React Router:** https://reactrouter.com/

---

## 🆘 Soporte

Para cualquier problema o duda:
- **Developer:** Fabiano Carte
- **Product Owner:** Martin Silva
- **GitHub Issues:** [Crear issue en el repo]

---

¡Feliz desarrollo! 🚀
