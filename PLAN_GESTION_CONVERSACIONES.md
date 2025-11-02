# 🎯 PLAN: Sistema de Gestión de Conversaciones WhatsApp

## 📋 Objetivo
Implementar un sistema inteligente que:
- ✅ Mantenga contexto de conversación (no saludar repetidamente)
- ✅ Prevenga duplicación de OT (1 solicitud activa por chofer)
- ✅ Diferencie conversación casual de incidencias reales
- ✅ Proporcione respuestas contextuales inteligentes

---

## 🏗️ ARQUITECTURA

### 1. Base de Datos

#### Tabla: `conversaciones`
```sql
- id: INT PRIMARY KEY
- telefono: VARCHAR(20) UNIQUE
- chofer_id: INT (FK)
- estado: ENUM('activa', 'esperando_info', 'cerrada')
- ultimo_saludo: DATETIME
- resumen_conversacion: TEXT
- ultimo_mensaje: DATETIME
- mensajes_sin_incidencia: INT
- tiene_solicitud_activa: BOOLEAN
- solicitud_activa_id: INT (FK)
```

#### Tabla: `historial_mensajes`
```sql
- id: INT PRIMARY KEY
- conversacion_id: INT (FK)
- telefono: VARCHAR(20)
- tipo: ENUM('entrante', 'saliente')
- mensaje: TEXT
- tiene_imagenes: BOOLEAN
- numero_imagenes: INT
- fue_incidencia: BOOLEAN
- metadata: JSON
- created_at: TIMESTAMP
```

### 2. Servicios

#### `conversationManager.js`
- `obtenerConversacion()`: Buscar/crear conversación
- `debeSaludar()`: Verificar si debe saludar
- `puedeCrearSolicitud()`: Validar si puede crear OT
- `registrarNuevaSolicitud()`: Marcar OT activa
- `agregarMensaje()`: Guardar en historial
- `obtenerContextoIA()`: Resumen para GPT
- `obtenerSugerenciaAutomatica()`: Sugerencias inteligentes
- `limpiarConversacionesAntiguas()`: Cron job

---

## 🔄 FLUJO DE PROCESAMIENTO

### Paso 1: Recibir Mensaje
```
WhatsApp → Twilio → Webhook
```

### Paso 2: Obtener/Crear Conversación
```javascript
const conversacion = await ConversationManager.obtenerConversacion(telefono, models);
```

### Paso 3: Verificar Estado
```javascript
if (conversacion.tiene_solicitud_activa) {
    // Opción A: Es información adicional para OT existente
    // Opción B: Informar que ya tiene OT en proceso
} else {
    // Evaluar si es nueva incidencia
}
```

### Paso 4: Evaluar con IA + Contexto
```javascript
const contexto = await ConversationManager.obtenerContextoIA(conversacion, models);
const filtro = await esIncidenciaReal(mensaje, tieneImagenes, contexto);
```

### Paso 5: Tomar Acción
```javascript
if (filtro.esIncidencia && conversacion.puedeCrearSolicitud()) {
    // Crear nueva OT
    await ConversationManager.registrarNuevaSolicitud(conversacion, solicitudId);
} else {
    // Responder conversacionalmente
}
```

### Paso 6: Guardar en Historial
```javascript
await ConversationManager.agregarMensaje(conversacion, models, {
    tipo: 'entrante',
    mensaje: mensaje,
    tieneImagenes: mediaUrls.length > 0,
    numeroImagenes: mediaUrls.length,
    fueIncidencia: seCreoSolicitud
});
```

---

## 🎭 CASOS DE USO

### Caso 1: Primer Contacto
```
Chofer: "Hola buenas"
Bot: "👋 ¡Hola! Soy el asistente de mantenimiento de PepsiCo..."
[Marca: ultimo_saludo = NOW()]
```

### Caso 2: Ya Saludó (<4h)
```
Chofer: "Hola"
Bot: "¿En qué puedo ayudarte?"
[NO vuelve a presentarse]
```

### Caso 3: Tiene OT Activa - Consulta
```
Chofer: "¿Cómo va mi solicitud?"
Bot: "Tu solicitud #15 está en estado 'pendiente'. Será atendida pronto."
[NO crea nueva OT]
```

### Caso 4: Tiene OT Activa - Más Info
```
Chofer: [envía foto adicional]
Bot: "✅ Imagen agregada a tu solicitud #15"
[Agrega foto a OT existente]
```

### Caso 5: No Tiene OT - Nueva Incidencia
```
Chofer: "Tengo un problema con los frenos"
Bot: [Crea OT] "✅ Solicitud #16 registrada..."
[Marca: tiene_solicitud_activa = true]
```

### Caso 6: Conversación Casual
```
Chofer: "Gracias"
Bot: "¡De nada! Estoy aquí para ayudarte."
[mensajes_sin_incidencia++, NO crea OT]
```

### Caso 7: Muchos Mensajes Sin Incidencia
```
Chofer: "ok" (mensaje #3 sin incidencia)
Bot: "👋 Noto que has enviado varios mensajes. ¿Necesitas reportar algún problema?"
```

---

## 🔐 REGLAS DE NEGOCIO

### Regla 1: Una OT Activa por Chofer
**Estados activos:** `pendiente`, `en_proceso`, `esperando_repuesto`

```javascript
if (conversacion.tiene_solicitud_activa) {
    return {
        puede: false,
        mensaje: `Ya tienes la solicitud #${id} en proceso.`
    };
}
```

### Regla 2: No Saludar Repetidamente
```javascript
if (ultimo_saludo && (NOW - ultimo_saludo) < 4 horas) {
    // Respuesta directa sin presentación
}
```

### Regla 3: Contexto para IA
```javascript
prompt = `
CONTEXTO PREVIO:
${await ConversationManager.obtenerContextoIA(conversacion)}

MENSAJE ACTUAL:
"${mensaje}"

¿Es una incidencia nueva o solo conversación?
`;
```

### Regla 4: Limpieza Automática
**Cron Job (cada hora):**
```javascript
await ConversationManager.limpiarConversacionesAntiguas(models, 24);
// Cierra conversaciones sin actividad por 24h
```

---

## 📊 MÉTRICAS A MONITOREAR

1. **Tasa de falsos positivos** (conversaciones que generan OT innecesarias)
2. **Tasa de falsos negativos** (incidencias que no generan OT)
3. **Promedio de mensajes por conversación**
4. **Tiempo de respuesta del bot**
5. **Satisfacción del usuario** (basada en agradecimientos)

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Fase 1: Base de Datos ✅
- [x] Crear migration SQL
- [x] Crear modelos Sequelize
- [x] Actualizar relaciones

### Fase 2: Servicio de Conversación ✅
- [x] ConversationManager
- [x] Cache en memoria
- [x] Funciones de contexto

### Fase 3: Integración Webhook (SIGUIENTE)
- [ ] Modificar webhook.controller.js
- [ ] Integrar ConversationManager
- [ ] Actualizar filtro de incidencias
- [ ] Agregar lógica de OT única

### Fase 4: IA Contextual
- [ ] Pasar contexto a esIncidenciaReal()
- [ ] Mejorar prompt con historial
- [ ] Respuestas más naturales

### Fase 5: Testing
- [ ] Probar casos de uso
- [ ] Verificar prevención de duplicados
- [ ] Validar respuestas contextuales

### Fase 6: Cron Jobs
- [ ] Crear script de limpieza
- [ ] Configurar en server.js
- [ ] Monitorear logs

---

## 💻 COMANDOS ÚTILES

### Ejecutar Migration
```bash
mysql -u root -p pepsico_fleet_db < database/migration_conversaciones.sql
```

### Verificar Tablas
```sql
SHOW TABLES;
DESCRIBE conversaciones;
DESCRIBE historial_mensajes;
```

### Consultas de Debug
```sql
-- Ver conversaciones activas
SELECT * FROM conversaciones WHERE estado = 'activa';

-- Ver historial de un teléfono
SELECT * FROM historial_mensajes 
WHERE conversacion_id = (SELECT id FROM conversaciones WHERE telefono = '+56987564191')
ORDER BY created_at DESC;

-- Choferes con múltiples OT activas (no debería pasar)
SELECT telefono, COUNT(*) as ots_activas 
FROM solicitudes 
WHERE estado IN ('pendiente', 'en_proceso') 
GROUP BY telefono 
HAVING COUNT(*) > 1;
```

---

## 🎯 BENEFICIOS ESPERADOS

1. **Reducción 80%** en OT duplicadas
2. **Mejora experiencia** del chofer (respuestas contextuales)
3. **Menos ruido** en el sistema (filtrar saludos/conversación)
4. **Historial completo** para análisis y auditoría
5. **Base para chatbot** más sofisticado en el futuro

---

## ⚠️ CONSIDERACIONES

### Seguridad
- Validar que el teléfono no pueda manipular solicitud de otro
- Sanitizar mensajes antes de guardar

### Performance
- Cache en memoria reduce consultas a BD
- Índices en `telefono`, `estado`, `ultimo_mensaje`

### Escalabilidad
- Si crece mucho, considerar Redis en lugar de NodeCache
- Particionar historial_mensajes por fecha

### Privacidad
- Los mensajes se guardan para contexto
- Cumplir con políticas de retención de datos
- Opción de borrar historial antiguo

---

## 📝 NOTAS DE DESARROLLO

- El sistema es **tolerante a fallos**: Si falla la IA, usa detección por keywords
- El cache expira cada hora pero se refresca con cada consulta
- Las conversaciones se cierran automáticamente después de 24h sin actividad
- El historial completo se mantiene incluso si la conversación se cierra

---

**Última actualización:** 2025-10-20
**Estado:** Fase 2 completa, listo para Fase 3 (Integración)
