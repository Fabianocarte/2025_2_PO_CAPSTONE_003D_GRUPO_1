# 📸 Plan de Implementación: Manejo de Imágenes en WhatsApp

## 🎯 Objetivo
Permitir que los choferes envíen imágenes junto con sus reportes, con manejo inteligente de:
1. **Mensaje + imágenes inmediatas** (llegan juntas)
2. **Mensaje primero, imágenes después** (llegan por separado con segundos de diferencia)

---

## 📊 Análisis del Flujo Actual

### ✅ Lo que ya funciona:
- Recepción de mensajes de WhatsApp
- Captura de URLs de medias (MediaUrl0, MediaUrl1, MediaUrl2)
- Almacenamiento en campo `imagenes` (JSON) en tabla `solicitudes`
- Clasificación con IA del texto

### ⚠️ Problemas a resolver:
1. **WhatsApp envía mensajes y fotos por separado**: El texto llega primero, las imágenes llegan 1-3 segundos después como mensajes independientes
2. **Sin buffer de espera**: Sistema responde inmediatamente sin esperar imágenes
3. **Sin actualización posterior**: Si llegan fotos después del primer mensaje, no se asocian a la solicitud

---

## 🏗️ Arquitectura de la Solución

### **Estrategia: Sistema de Buffer Temporal con Estados**

```
┌─────────────────────────────────────────────────────────┐
│  FLUJO: Mensaje de WhatsApp recibido                   │
└─────────────────────────────────────────────────────────┘
                          ↓
         ┌────────────────────────────────┐
         │ ¿Tiene texto (Body)?           │
         └────────────────────────────────┘
                /                    \
              SÍ                      NO
               ↓                       ↓
    ┌──────────────────┐    ┌──────────────────┐
    │ Crear/actualizar │    │ Solo tiene media │
    │ en estado BUFFER │    │ (imagen)         │
    │ Timer: 5 seg     │    │                  │
    └──────────────────┘    └──────────────────┘
               ↓                       ↓
    Esperar imágenes         Buscar solicitud
    (5 segundos)             reciente del mismo
               ↓              teléfono (< 10 seg)
    ┌──────────────────┐              ↓
    │ Timer expiró     │    ┌──────────────────┐
    │ Procesar todo    │    │ Agregar imagen   │
    │ Clasificar con IA│    │ a solicitud      │
    │ Enviar respuesta │    │ existente        │
    └──────────────────┘    └──────────────────┘
               ↓                       ↓
    ┌──────────────────┐    ┌──────────────────┐
    │ Estado: PENDIENTE│    │ Notificar        │
    │ Notificar chofer │    │ actualización    │
    └──────────────────┘    └──────────────────┘
```

---

## 🗄️ Cambios en Base de Datos

### 1. Agregar tabla para buffer temporal

```sql
CREATE TABLE solicitudes_buffer (
    id VARCHAR(50) PRIMARY KEY, -- telefono_timestamp
    telefono VARCHAR(20) NOT NULL,
    mensaje_texto TEXT,
    imagenes JSON, -- Array de URLs
    timestamp_inicial TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expira_en TIMESTAMP,
    procesado BOOLEAN DEFAULT FALSE,
    INDEX idx_telefono_procesado (telefono, procesado),
    INDEX idx_expira (expira_en)
) ENGINE=InnoDB;
```

### 2. Modificar tabla `solicitudes` (opcional)

```sql
ALTER TABLE solicitudes 
ADD COLUMN imagenes_actualizadas_en TIMESTAMP NULL,
ADD COLUMN cantidad_imagenes INT DEFAULT 0;
```

---

## 💻 Implementación Técnica

### **Archivo 1: `bufferManager.js` (Nuevo servicio)**

```javascript
// backend/src/services/bufferManager.js

const NodeCache = require('node-cache');

// Cache en memoria: key = telefono, value = { mensaje, imagenes, timer }
const bufferCache = new NodeCache({ 
    stdTTL: 10, // 10 segundos por defecto
    checkperiod: 2 // Verificar cada 2 segundos
});

const BUFFER_TIMEOUT = 5000; // 5 segundos de espera

class BufferManager {
    
    /**
     * Agregar mensaje con texto al buffer
     */
    static agregarMensaje(telefono, datos) {
        const key = telefono;
        
        const bufferData = {
            telefono,
            mensaje: datos.mensaje,
            imagenes: datos.imagenes || [],
            timestamp: Date.now(),
            procesado: false,
            vehiculoId: datos.vehiculoId,
            choferId: datos.choferId
        };
        
        bufferCache.set(key, bufferData);
        
        return bufferData;
    }
    
    /**
     * Agregar imágenes a buffer existente o crear nuevo
     */
    static agregarImagenes(telefono, imagenes) {
        const key = telefono;
        const existing = bufferCache.get(key);
        
        if (existing && !existing.procesado) {
            // Agregar a buffer existente
            existing.imagenes = [...existing.imagenes, ...imagenes];
            bufferCache.set(key, existing);
            return { existente: true, buffer: existing };
        }
        
        // No hay buffer activo, es imagen huérfana
        return { existente: false, imagenes };
    }
    
    /**
     * Obtener buffer por teléfono
     */
    static obtenerBuffer(telefono) {
        return bufferCache.get(telefono);
    }
    
    /**
     * Marcar buffer como procesado
     */
    static marcarProcesado(telefono) {
        const buffer = bufferCache.get(telefono);
        if (buffer) {
            buffer.procesado = true;
            bufferCache.set(telefono, buffer);
        }
    }
    
    /**
     * Eliminar buffer
     */
    static eliminarBuffer(telefono) {
        bufferCache.del(telefono);
    }
    
    /**
     * Programar procesamiento con timeout
     */
    static programarProcesamiento(telefono, callback) {
        setTimeout(() => {
            const buffer = bufferCache.get(telefono);
            if (buffer && !buffer.procesado) {
                callback(buffer);
            }
        }, BUFFER_TIMEOUT);
    }
}

module.exports = BufferManager;
```

---

### **Archivo 2: `imageManager.js` (Nuevo servicio)**

```javascript
// backend/src/services/imageManager.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ImageManager {
    
    /**
     * Descargar imagen de Twilio a servidor local
     */
    static async descargarImagen(mediaUrl, twilioAuth) {
        try {
            const response = await axios.get(mediaUrl, {
                auth: {
                    username: process.env.TWILIO_ACCOUNT_SID,
                    password: process.env.TWILIO_AUTH_TOKEN
                },
                responseType: 'arraybuffer'
            });
            
            // Generar nombre único
            const extension = mediaUrl.split('.').pop().split('?')[0] || 'jpg';
            const filename = `${crypto.randomBytes(16).toString('hex')}.${extension}`;
            const filepath = path.join(__dirname, '../../uploads', filename);
            
            // Guardar archivo
            fs.writeFileSync(filepath, response.data);
            
            return {
                filename,
                url: `/uploads/${filename}`,
                size: response.data.length
            };
            
        } catch (error) {
            console.error('Error descargando imagen:', error.message);
            return null;
        }
    }
    
    /**
     * Descargar múltiples imágenes
     */
    static async descargarImagenes(mediaUrls) {
        const promesas = mediaUrls.map(url => this.descargarImagen(url));
        const resultados = await Promise.all(promesas);
        return resultados.filter(r => r !== null);
    }
    
    /**
     * Actualizar imágenes de una solicitud existente
     */
    static async actualizarImagenesSolicitud(solicitudId, nuevasImagenes) {
        const { Solicitud } = require('../models');
        
        const solicitud = await Solicitud.findByPk(solicitudId);
        if (!solicitud) return null;
        
        const imagenesActuales = solicitud.imagenes || [];
        const imagenesActualizadas = [...imagenesActuales, ...nuevasImagenes];
        
        await solicitud.update({
            imagenes: imagenesActualizadas,
            cantidad_imagenes: imagenesActualizadas.length,
            imagenes_actualizadas_en: new Date()
        });
        
        return solicitud;
    }
}

module.exports = ImageManager;
```

---

### **Archivo 3: Actualizar `webhook.controller.js`**

```javascript
// backend/src/controllers/webhook.controller.js

const { Solicitud, Usuario, Vehiculo } = require('../models');
const { clasificarSolicitud, generarRespuestaAutomatica } = require('../services/aiClassifier');
const { sendWhatsAppMessage } = require('../config/twilio');
const BufferManager = require('../services/bufferManager');
const ImageManager = require('../services/imageManager');

const recibirMensajeWhatsApp = async (req, res) => {
    try {
        console.log('📱 Webhook recibido:', req.body);

        const {
            From: telefonoOrigen,
            Body: mensaje,
            NumMedia: cantidadMedias,
            MediaUrl0, MediaUrl1, MediaUrl2
        } = req.body;

        const telefono = telefonoOrigen.replace('whatsapp:', '');
        const cantidadMediasNum = parseInt(cantidadMedias) || 0;
        
        // Recopilar URLs de medias
        const mediaUrls = [];
        if (cantidadMediasNum > 0) {
            if (MediaUrl0) mediaUrls.push(MediaUrl0);
            if (MediaUrl1) mediaUrls.push(MediaUrl1);
            if (MediaUrl2) mediaUrls.push(MediaUrl2);
        }

        // ==========================================
        // CASO 1: Solo imágenes (sin texto)
        // ==========================================
        if (!mensaje && mediaUrls.length > 0) {
            console.log('📸 Solo imágenes recibidas, buscando solicitud reciente...');
            
            // Buscar solicitud creada en los últimos 15 segundos
            const solicitudReciente = await Solicitud.findOne({
                where: {
                    telefono_origen: telefono,
                    created_at: {
                        [require('sequelize').Op.gte]: new Date(Date.now() - 15000)
                    }
                },
                order: [['created_at', 'DESC']]
            });
            
            if (solicitudReciente) {
                // Descargar y agregar imágenes
                const imagenesDescargadas = await ImageManager.descargarImagenes(mediaUrls);
                await ImageManager.actualizarImagenesSolicitud(
                    solicitudReciente.id, 
                    imagenesDescargadas.map(img => img.url)
                );
                
                console.log(`✅ ${imagenesDescargadas.length} imágenes agregadas a solicitud #${solicitudReciente.id}`);
                
                // Enviar confirmación
                await sendWhatsAppMessage(
                    telefono,
                    `✅ ${imagenesDescargadas.length} foto(s) agregada(s) a tu solicitud #${solicitudReciente.id}`
                );
            } else {
                console.log('⚠️ No se encontró solicitud reciente para estas imágenes');
                await sendWhatsAppMessage(
                    telefono,
                    '⚠️ No encontré una solicitud reciente. Por favor envía primero la descripción del problema.'
                );
            }
            
            return res.status(200).send('OK');
        }

        // ==========================================
        // CASO 2: Mensaje con/sin imágenes
        // ==========================================
        
        // Buscar chofer y vehículo
        const chofer = await Usuario.findOne({
            where: { telefono, rol: 'chofer' }
        });
        
        const patenteRegex = /([A-Z]{2,4}[-\s]?\d{2,4})/i;
        const patenteMatch = mensaje.match(patenteRegex);
        const patenteExtraida = patenteMatch ? 
            patenteMatch[1].replace(/\s/g, '-').toUpperCase() : null;
        
        let vehiculo = null;
        if (patenteExtraida) {
            vehiculo = await Vehiculo.findOne({
                where: { patente: patenteExtraida }
            });
        }
        
        // Descargar imágenes inmediatas
        const imagenesInmediatas = mediaUrls.length > 0 ?
            await ImageManager.descargarImagenes(mediaUrls) : [];
        
        // Agregar al buffer
        BufferManager.agregarMensaje(telefono, {
            mensaje,
            imagenes: imagenesInmediatas.map(img => img.url),
            vehiculoId: vehiculo?.id,
            choferId: chofer?.id
        });
        
        console.log(`⏳ Mensaje agregado al buffer. Esperando ${5} segundos por imágenes adicionales...`);
        
        // Programar procesamiento después del timeout
        BufferManager.programarProcesamiento(telefono, async (bufferData) => {
            try {
                await procesarSolicitudCompleta(bufferData, telefono);
            } catch (error) {
                console.error('Error procesando solicitud:', error);
            }
        });
        
        // Responder inmediatamente a Twilio
        res.status(200).send('OK');

    } catch (error) {
        console.error('❌ Error en webhook:', error);
        res.status(200).send('OK');
    }
};

/**
 * Procesar solicitud completa después del buffer
 */
async function procesarSolicitudCompleta(bufferData, telefono) {
    const { Solicitud, Usuario } = require('../models');
    
    console.log(`🔄 Procesando solicitud completa para ${telefono}`);
    console.log(`📸 Total de imágenes: ${bufferData.imagenes.length}`);
    
    // Marcar como procesado
    BufferManager.marcarProcesado(telefono);
    
    // Clasificar con IA
    const resultadoIA = await clasificarSolicitud(
        bufferData.mensaje, 
        bufferData.imagenes.length > 0
    );
    
    // Crear solicitud
    const nuevaSolicitud = await Solicitud.create({
        chofer_id: bufferData.choferId || null,
        vehiculo_id: bufferData.vehiculoId || null,
        descripcion: bufferData.mensaje,
        mensaje_original: bufferData.mensaje,
        telefono_origen: telefono,
        tipo: resultadoIA.clasificacion.tipo,
        prioridad: resultadoIA.clasificacion.prioridad,
        estado: 'pendiente',
        imagenes: bufferData.imagenes,
        cantidad_imagenes: bufferData.imagenes.length,
        clasificacion_ia: resultadoIA.clasificacion,
        fecha_hora: new Date()
    });
    
    console.log(`✅ Solicitud #${nuevaSolicitud.id} creada con ${bufferData.imagenes.length} imágenes`);
    
    // Generar respuesta
    const respuesta = generarRespuestaAutomatica(
        resultadoIA.clasificacion,
        nuevaSolicitud.id,
        bufferData.imagenes.length
    );
    
    // Enviar respuesta
    await sendWhatsAppMessage(telefono, respuesta);
    
    // Notificar supervisores si es urgente
    if (resultadoIA.clasificacion.prioridad === 'urgente') {
        const supervisores = await Usuario.findAll({
            where: { rol: 'supervisor', activo: true }
        });
        
        for (const sup of supervisores) {
            if (sup.telefono) {
                await sendWhatsAppMessage(
                    sup.telefono,
                    `🚨 *SOLICITUD URGENTE* #${nuevaSolicitud.id}\n` +
                    `${resultadoIA.clasificacion.resumen}\n` +
                    `Imágenes: ${bufferData.imagenes.length}`
                );
            }
        }
    }
    
    // Limpiar buffer
    BufferManager.eliminarBuffer(telefono);
}

module.exports = {
    recibirMensajeWhatsApp,
    testWebhook: (req, res) => {
        res.json({
            message: 'Webhook funcionando',
            timestamp: new Date().toISOString()
        });
    }
};
```

---

### **Archivo 4: Actualizar `aiClassifier.js`**

```javascript
// Modificar la función generarRespuestaAutomatica

function generarRespuestaAutomatica(clasificacion, solicitudId, cantidadImagenes = 0) {
    const { prioridad, tipo, resumen } = clasificacion;
    
    let emoji = '📋';
    if (prioridad === 'urgente') emoji = '🚨';
    else if (prioridad === 'alta') emoji = '⚠️';
    
    const imagenesTexto = cantidadImagenes > 0 ? 
        `\n📸 ${cantidadImagenes} foto(s) recibida(s)` : '';
    
    return `${emoji} *Solicitud Recibida*

✅ Tu reporte ha sido registrado exitosamente.

*Folio:* #${solicitudId}
*Tipo:* ${tipo}
*Prioridad:* ${prioridad.toUpperCase()}
*Resumen:* ${resumen}${imagenesTexto}

Un supervisor revisará tu solicitud pronto. Te notificaremos cuando sea atendida.

_Sistema PepsiCo Fleet Management_`;
}
```

---

## 📦 Dependencias Nuevas

```json
{
  "dependencies": {
    "node-cache": "^5.1.2",
    "axios": "^1.6.0"
  }
}
```

---

## ⚙️ Configuración de Variables

```env
# .env
BUFFER_TIMEOUT_MS=5000
MAX_IMAGE_SIZE_MB=10
UPLOAD_DIR=./uploads
```

---

## 🧪 Casos de Prueba

### Caso 1: Mensaje + imágenes inmediatas
```
Usuario envía: "Camión AB-1234 con fuga de aceite" + 2 fotos
Sistema:
  1. Recibe mensaje y fotos juntas
  2. Buffer: 5 segundos
  3. Procesa todo junto
  4. Respuesta: Solicitud #X con 2 fotos
```

### Caso 2: Mensaje primero, fotos después
```
Usuario envía: "Camión AB-1234 con fuga de aceite"
Sistema: Buffer activo (esperando 5 seg)
[3 segundos después]
Usuario envía: 2 fotos
Sistema: 
  1. Detecta buffer activo
  2. Agrega fotos al buffer
  3. Al finalizar timeout: procesa todo
  4. Respuesta: Solicitud #X con 2 fotos
```

### Caso 3: Fotos huérfanas
```
Usuario envía: 2 fotos (sin mensaje previo reciente)
Sistema:
  1. Busca solicitud de últimos 15 segundos
  2. No encuentra
  3. Respuesta: "Envía primero la descripción"
```

### Caso 4: Fotos tardías
```
Usuario envía mensaje → Sistema procesa después de 5seg
[10 segundos después]
Usuario envía fotos
Sistema:
  1. Busca solicitud reciente (< 15 seg)
  2. Encuentra solicitud #X
  3. Actualiza con fotos
  4. Respuesta: "Fotos agregadas a solicitud #X"
```

---

## 📊 Métricas y Monitoreo

```javascript
// Agregar logging
console.log({
    evento: 'buffer_creado',
    telefono,
    imagenes_inmediatas: imagenesInmediatas.length,
    timestamp: Date.now()
});

console.log({
    evento: 'solicitud_procesada',
    solicitud_id: nuevaSolicitud.id,
    total_imagenes: bufferData.imagenes.length,
    tiempo_buffer: Date.now() - bufferData.timestamp
});
```

---

## 🚀 Plan de Implementación

### **Sprint: 2 días**

#### Día 1 - Infraestructura
- [ ] Crear `bufferManager.js`
- [ ] Crear `imageManager.js`
- [ ] Modificar schema.sql (agregar campos opcionales)
- [ ] Instalar dependencias (`node-cache`, etc.)
- [ ] Tests unitarios de BufferManager

#### Día 2 - Integración
- [ ] Actualizar `webhook.controller.js`
- [ ] Actualizar `aiClassifier.js` (respuestas con conteo de imágenes)
- [ ] Crear carpeta `uploads/` con permisos
- [ ] Tests de integración (casos 1-4)
- [ ] Documentación de API

---

## 🔐 Consideraciones de Seguridad

1. **Validar tipos de archivo**: Solo JPG, PNG
2. **Límite de tamaño**: Máximo 10MB por imagen
3. **Sanitizar nombres**: Usar UUID aleatorios
4. **Autenticación Twilio**: Verificar firma webhook
5. **Rate limiting**: Máximo 10 imágenes por solicitud

---

## 📝 Notas Importantes

- **Timeout configurable**: Puede ajustarse según pruebas reales
- **Persistencia opcional**: El buffer es en memoria (se pierde al reiniciar), pero las solicitudes ya creadas persisten en BD
- **Escalabilidad**: Para múltiples servidores, usar Redis en lugar de NodeCache
- **Twilio Media**: Las URLs de Twilio expiran en 3 horas, por eso se descargan inmediatamente

---

¿Quieres que comience con la implementación? 🚀
