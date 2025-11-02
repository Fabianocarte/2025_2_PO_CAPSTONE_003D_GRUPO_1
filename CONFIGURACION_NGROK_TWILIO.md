# 🌐 Configuración de ngrok + Twilio para WhatsApp Webhooks

Esta guía te muestra cómo conectar tu servidor local con Twilio usando ngrok para recibir mensajes de WhatsApp.

---

## 📋 Pre-requisitos

- ✅ Backend corriendo en puerto 5000
- ✅ Cuenta de Twilio con WhatsApp Business API
- ✅ ngrok instalado

---

## 🔧 PASO 1: Instalar ngrok (si no lo tienes)

### Opción A: Usando el script automático
```powershell
# En la raíz del proyecto
.\install-ngrok.bat
```

### Opción B: Manualmente
1. Descarga ngrok: https://ngrok.com/download
2. Descomprime el archivo
3. Mueve `ngrok.exe` a una carpeta en tu PATH

### Verificar instalación:
```powershell
ngrok version
```

Deberías ver algo como: `ngrok version 3.x.x`

---

## 🚀 PASO 2: Iniciar tu Backend

```powershell
# Terminal 1 - Backend
cd backend
npm start
```

**Verificar que esté corriendo:**
- Abre: http://localhost:5000
- Deberías ver: `{ "message": "🚛 PepsiCo Fleet Management API", ... }`

---

## 🌍 PASO 3: Exponer tu servidor con ngrok

```powershell
# Terminal 2 - ngrok
ngrok http 5000
```

**Salida esperada:**
```
ngrok

Session Status                online
Account                       tu-email@example.com
Version                       3.x.x
Region                        United States (us)
Latency                       50ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://xxxx-yyyy-zzzz.ngrok-free.app -> http://localhost:5000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

### 🔑 **IMPORTANTE: Copia la URL de Forwarding**
```
https://xxxx-yyyy-zzzz.ngrok-free.app
```
Esta es tu URL pública temporal. ⚠️ **Cambia cada vez que reinicies ngrok**.

---

## 📱 PASO 4: Configurar Webhook en Twilio

### 1️⃣ Ir a Twilio Console
```
https://console.twilio.com/
```

### 2️⃣ Navegar a WhatsApp Senders
```
Messaging → Try it out → Send a WhatsApp message
```
O directamente:
```
https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
```

### 3️⃣ Configurar el Webhook

#### **Método 1: Desde WhatsApp Sandbox (Testing)**

1. Ve a **WhatsApp Sandbox Settings**:
   ```
   Messaging → Settings → WhatsApp Sandbox Settings
   ```

2. En **"When a message comes in"**:
   ```
   URL: https://tu-ngrok-url.ngrok-free.app/api/webhook/whatsapp
   Método: HTTP POST
   ```

3. Ejemplo:
   ```
   https://a1b2-c3d4-e5f6.ngrok-free.app/api/webhook/whatsapp
   ```

4. Click **Save**

#### **Método 2: Desde tu número de WhatsApp de producción**

1. Ve a **Phone Numbers → Manage → Active Numbers**
2. Click en tu número de WhatsApp
3. Scroll hasta **Messaging Configuration**
4. En **"A MESSAGE COMES IN"**:
   ```
   Webhook: https://tu-ngrok-url.ngrok-free.app/api/webhook/whatsapp
   Método: HTTP POST
   ```
5. Click **Save**

---

## ✅ PASO 5: Verificar la Conexión

### 1️⃣ Probar el Endpoint Manualmente

```powershell
# En otra terminal
curl http://localhost:5000/api/webhook/whatsapp
```

**Respuesta esperada:**
```
Webhook OK
```

### 2️⃣ Probar desde la URL de ngrok

```powershell
curl https://tu-ngrok-url.ngrok-free.app/api/webhook/whatsapp
```

**Respuesta esperada:**
```
Webhook OK
```

### 3️⃣ Ver logs de ngrok

Abre en tu navegador:
```
http://127.0.0.1:4040
```

Aquí verás **todas las peticiones HTTP** que llegan a tu servidor.

---

## 📱 PASO 6: Enviar Mensaje de Prueba

### Si usas WhatsApp Sandbox:

1. **Únete al Sandbox** (solo la primera vez):
   - Desde tu WhatsApp personal
   - Envía el código que te da Twilio (ejemplo: `join abc-def`)
   - Al número de Twilio Sandbox (ejemplo: +1 415 523 8886)

2. **Envía un mensaje de prueba:**
   ```
   Hola, tengo un problema con la patente AA1234
   ```

3. **Revisa tu terminal del backend:**
   ```
   📱 Mensaje de WhatsApp recibido: { From: 'whatsapp:+56912345678', Body: 'Hola...' }
   ```

4. **Revisa ngrok dashboard** (http://127.0.0.1:4040):
   - Verás el POST a `/api/webhook/whatsapp`
   - Status 200 OK
   - Payload completo

---

## 🔍 PASO 7: Debugging

### Ver logs del backend
```powershell
cd backend
npm start
```

Los logs mostrarán:
```
📱 Mensaje de WhatsApp recibido: { ... }
💬 Conversación ID: 1, Estado: activa
📊 Recibido de +56912345678: Texto=true, Medias=0
🤖 Clasificando con IA...
✅ Clasificación IA completada: { tipo: 'falla_mecanica', ... }
✅ Solicitud #123 creada
📤 Respuesta enviada a +56912345678
```

### Ver logs de ngrok (web)
```
http://127.0.0.1:4040/inspect/http
```

### Ver logs de Twilio
```
https://console.twilio.com/us1/monitor/logs/debugger
```

---

## ⚠️ PROBLEMAS COMUNES

### 1️⃣ "Webhook returned 404"

**Solución:**
- Verifica que la URL sea exactamente: `https://tu-ngrok.ngrok-free.app/api/webhook/whatsapp`
- Nota el `/api/webhook/whatsapp` al final
- NO debe terminar en `/`

### 2️⃣ "Webhook timeout"

**Solución:**
- Verifica que el backend esté corriendo (`npm start`)
- Verifica que ngrok esté activo
- Revisa logs de ngrok: http://127.0.0.1:4040

### 3️⃣ "No llegan mensajes"

**Solución:**
- Verifica que enviaste `join xxx-xxx` al sandbox (si usas sandbox)
- Revisa el debugger de Twilio: https://console.twilio.com/us1/monitor/logs/debugger
- Verifica que el webhook esté guardado correctamente

### 4️⃣ "ngrok URL cambió"

**Problema:** Cada vez que reinicias ngrok, la URL cambia.

**Soluciones:**

**A) Usar ngrok gratis (URL cambia siempre):**
1. Reinicia ngrok
2. Copia la nueva URL
3. Actualiza en Twilio
4. Listo

**B) Usar ngrok con dominio fijo (requiere cuenta de pago):**
```powershell
ngrok http 5000 --domain=tu-dominio.ngrok-free.app
```

**C) Usar túnel alternativo gratis con URL fija:**
- **Cloudflare Tunnel** (gratis, URL fija)
- **LocalTunnel** (gratis)
- **serveo.net** (gratis)

---

## 🎯 CONFIGURACIÓN RECOMENDADA PARA DESARROLLO

### Terminal 1: Backend
```powershell
cd C:\Users\twfan\OneDrive\Desktop\PepsicoApp\backend
npm run dev
```

### Terminal 2: Frontend
```powershell
cd C:\Users\twfan\OneDrive\Desktop\PepsicoApp\frontend
npm run dev
```

### Terminal 3: ngrok
```powershell
ngrok http 5000
```

### Browser 1: Frontend
```
http://localhost:5173
```

### Browser 2: ngrok Inspector
```
http://localhost:4040
```

---

## 🔐 SEGURIDAD (Opcional)

### Validar que los webhooks vienen de Twilio

En `backend/src/controllers/webhook.controller.js`:

```javascript
const crypto = require('crypto');

const validarFirmaTwilio = (req) => {
    const signature = req.headers['x-twilio-signature'];
    const url = `https://tu-ngrok-url.ngrok-free.app${req.originalUrl}`;
    
    const expectedSignature = crypto
        .createHmac('sha1', process.env.TWILIO_AUTH_TOKEN)
        .update(Buffer.from(url + JSON.stringify(req.body), 'utf-8'))
        .digest('base64');
    
    return signature === expectedSignature;
};

// Usar en el webhook
const recibirMensajeWhatsApp = async (req, res) => {
    // Validar firma (comentado por defecto en desarrollo)
    // if (!validarFirmaTwilio(req)) {
    //     return res.status(403).send('Firma inválida');
    // }
    
    // ... resto del código
};
```

---

## 📝 RESUMEN RÁPIDO

```powershell
# 1. Iniciar backend
cd backend
npm start

# 2. Iniciar ngrok (en otra terminal)
ngrok http 5000

# 3. Copiar URL de ngrok
# Ejemplo: https://a1b2-c3d4.ngrok-free.app

# 4. Ir a Twilio Console
# Configurar webhook: https://a1b2-c3d4.ngrok-free.app/api/webhook/whatsapp

# 5. Enviar mensaje de WhatsApp
# ¡Listo! 🎉
```

---

## 🔗 Enlaces Útiles

- **ngrok Dashboard:** http://localhost:4040
- **Twilio Console:** https://console.twilio.com
- **Twilio Debugger:** https://console.twilio.com/us1/monitor/logs/debugger
- **WhatsApp Sandbox:** https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

---

## 💡 TIPS

1. **ngrok Inspector es tu amigo:**
   - Ve todas las peticiones en tiempo real
   - Examina headers, body, respuestas
   - Re-envía peticiones para testing

2. **Guarda tu URL de ngrok:**
   ```powershell
   # Crear variable de entorno temporal
   $env:NGROK_URL = "https://tu-url.ngrok-free.app"
   echo $env:NGROK_URL
   ```

3. **Logs, logs, logs:**
   - Backend: Terminal donde corre `npm start`
   - ngrok: http://localhost:4040
   - Twilio: Console Debugger

4. **Testing sin WhatsApp:**
   ```powershell
   # Simular webhook de Twilio
   curl -X POST http://localhost:5000/api/webhook/whatsapp `
     -H "Content-Type: application/x-www-form-urlencoded" `
     -d "From=whatsapp:+56912345678&Body=Test&NumMedia=0"
   ```

---

¡Ahora tu sistema está listo para recibir mensajes de WhatsApp en tiempo real! 🚀📱
