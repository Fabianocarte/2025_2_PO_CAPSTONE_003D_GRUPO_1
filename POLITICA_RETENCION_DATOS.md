# 📊 Política de Retención de Datos - Conversaciones WhatsApp

## 🎯 Principio Fundamental

**Las conversaciones NUNCA se borran de la base de datos.**

Esto permite:
- ✅ Mantener historial completo de cada trabajador
- ✅ Identificar patrones de comportamiento
- ✅ Auditoría y trazabilidad completa
- ✅ Análisis de métricas a largo plazo
- ✅ Evidencia de comunicaciones

---

## 🔄 Estados de Conversación

### 1. **activa**
- Conversación en curso
- Puede recibir y enviar mensajes
- Puede crear nuevas OT (si no tiene una activa)

### 2. **esperando_info**
- Conversación donde se espera más información del chofer
- Para OT incompletas que requieren datos adicionales

### 3. **cerrada**
- Conversación sin actividad por más de 24 horas
- NO se borra, solo cambia de estado
- Se puede reactivar automáticamente al recibir nuevo mensaje
- Historial se mantiene intacto

---

## 🧹 Mantenimiento Automático

### Cada 1 Hora
El sistema ejecuta automáticamente:

#### 1. Cerrar Conversaciones Inactivas
```sql
UPDATE conversaciones 
SET estado = 'cerrada'
WHERE ultimo_mensaje < NOW() - INTERVAL 24 HOUR
  AND estado = 'activa'
  AND tiene_solicitud_activa = FALSE;
```

**Resultado:** Conversaciones inactivas pasan a estado `cerrada`, pero **NO se borran**.

#### 2. Limpiar Flags de OT Finalizadas
```sql
UPDATE conversaciones 
SET tiene_solicitud_activa = FALSE,
    solicitud_activa_id = NULL,
    estado = 'activa'
WHERE tiene_solicitud_activa = TRUE
  AND solicitud_activa_id IN (
      SELECT id FROM solicitudes 
      WHERE estado IN ('completada', 'cancelada', 'rechazada')
  );
```

**Resultado:** Permite crear nuevas OT cuando la anterior está finalizada.

---

## 📈 Retención de Datos

| Tabla | Política | Tiempo de Retención |
|-------|----------|---------------------|
| `conversaciones` | **PERMANENTE** | ♾️ Indefinido |
| `historial_mensajes` | **PERMANENTE** | ♾️ Indefinido |
| `solicitudes` | **PERMANENTE** | ♾️ Indefinido |

**Razón:** Cumplimiento normativo, auditoría, y análisis histórico.

---

## 🔍 Consultas Útiles

### Ver Historial Completo de un Trabajador
```sql
SELECT 
    c.telefono,
    c.estado,
    c.created_at as primera_conversacion,
    COUNT(DISTINCT hm.id) as total_mensajes,
    COUNT(DISTINCT s.id) as total_solicitudes
FROM conversaciones c
LEFT JOIN historial_mensajes hm ON c.id = hm.conversacion_id
LEFT JOIN solicitudes s ON c.telefono = s.telefono_origen
WHERE c.telefono = '+56987564191'
GROUP BY c.id;
```

### Mensajes de los Últimos 30 Días
```sql
SELECT 
    DATE(created_at) as fecha,
    COUNT(*) as mensajes
FROM historial_mensajes
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at)
ORDER BY fecha DESC;
```

### Trabajadores Más Activos
```sql
SELECT 
    c.telefono,
    u.nombre,
    COUNT(hm.id) as total_mensajes,
    MAX(hm.created_at) as ultimo_mensaje
FROM conversaciones c
LEFT JOIN usuarios u ON c.chofer_id = u.id
LEFT JOIN historial_mensajes hm ON c.id = hm.conversacion_id
GROUP BY c.telefono
ORDER BY total_mensajes DESC
LIMIT 10;
```

### Conversaciones con OT Activas
```sql
SELECT 
    c.telefono,
    u.nombre,
    c.solicitud_activa_id,
    s.estado as estado_ot,
    s.prioridad,
    TIMESTAMPDIFF(HOUR, s.created_at, NOW()) as horas_desde_creacion
FROM conversaciones c
JOIN usuarios u ON c.chofer_id = u.id
JOIN solicitudes s ON c.solicitud_activa_id = s.id
WHERE c.tiene_solicitud_activa = TRUE;
```

---

## 📊 Estadísticas del Sistema

El sistema registra automáticamente:

```javascript
{
  total: 15,                 // Total de conversaciones
  activas: 8,                // Conversaciones activas
  conOTActiva: 3,            // Con OT en proceso
  cerradas: 7,               // Cerradas por inactividad
  totalMensajes: 142,        // Total de mensajes históricos
  mensajesHoy: 23            // Mensajes de hoy
}
```

---

## 🔐 Consideraciones de Privacidad

### GDPR / Ley de Protección de Datos

Si se requiere eliminar datos de un trabajador:

```sql
-- 1. Anonimizar mensajes
UPDATE historial_mensajes 
SET mensaje = '[MENSAJE ELIMINADO POR SOLICITUD DEL USUARIO]',
    metadata = NULL
WHERE conversacion_id IN (
    SELECT id FROM conversaciones WHERE telefono = '+56XXXXXXXXX'
);

-- 2. Anonimizar conversación
UPDATE conversaciones
SET telefono = 'ANONIMIZADO',
    resumen_conversacion = NULL
WHERE telefono = '+56XXXXXXXXX';

-- Nota: NO borrar registros para mantener integridad referencial
```

---

## ⚙️ Configuración

### Cambiar Tiempo de Inactividad

En `server.js`:
```javascript
const resultado = await ConversationManager.actualizarEstadoConversaciones(
    { Conversacion, Solicitud },
    48  // Cambiar a 48 horas en lugar de 24
);
```

### Cambiar Frecuencia de Limpieza

En `server.js`:
```javascript
const HORA_EN_MS = 2 * 60 * 60 * 1000; // Cada 2 horas en lugar de 1
setInterval(ejecutarMantenimientoConversaciones, HORA_EN_MS);
```

---

## 📝 Logs del Sistema

El mantenimiento genera logs como:

```
🔧 Ejecutando mantenimiento de conversaciones...
🧹 Mantenimiento de conversaciones:
   - 3 conversaciones marcadas como cerradas (inactivas)
   - 2 flags de OT activa limpiados (OT finalizadas)
   📊 Todas las conversaciones se mantienen en BD para historial
📊 Estadísticas de conversaciones:
   Total: 15 | Activas: 12 | Con OT: 3 | Cerradas: 3
   Mensajes totales: 142 | Hoy: 23
```

---

## ✅ Resumen

1. ✅ **Conversaciones = Permanentes** (nunca se borran)
2. ✅ **Historial de mensajes = Permanente** (trazabilidad completa)
3. ✅ **Estados se actualizan** (activa ↔ cerrada)
4. ✅ **Flags de OT se limpian** (permite nuevas OT)
5. ✅ **Mantenimiento automático** (cada hora)
6. ✅ **Reactivación automática** (al recibir nuevo mensaje)

**Beneficio clave:** Conocer el comportamiento histórico de cada trabajador y tener evidencia completa de todas las comunicaciones.

---

**Última actualización:** 2025-10-20  
**Responsable:** Sistema de Gestión de Flotas PepsiCo
