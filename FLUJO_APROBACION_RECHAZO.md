# ✅❌ Sistema de Aprobación y Rechazo de Solicitudes

## 🎯 Objetivo
Permitir a supervisores y administradores aprobar o rechazar solicitudes con las siguientes características:
- ✅ **Aprobar** → Crea automáticamente una Orden de Trabajo
- ❌ **Rechazar** → Permite editar clasificación errónea de la IA
- ✏️ **Editar** → Corregir datos y re-aprobar

---

## 🔄 FLUJO COMPLETO

### 1️⃣ Solicitud Llega (WhatsApp → Sistema)
```
Chofer envía mensaje + fotos
    ↓
IA clasifica automáticamente
    ↓
Solicitud creada en estado: PENDIENTE
    ↓
Notificación a supervisores
```

### 2️⃣ Supervisor Revisa Solicitud
```
Dashboard → Ver Solicitudes → Abrir Detalle
```

**Información visible:**
- 📋 Datos del chofer y vehículo
- 📝 Descripción del problema
- 🤖 Clasificación de la IA (tipo, prioridad, resumen)
- 📸 Evidencias fotográficas
- 📊 Estado actual

### 3️⃣ Dos Caminos Posibles

#### 🟢 **CAMINO A: IA Clasificó BIEN → APROBAR**

```
Supervisor hace click en "✅ Aprobar (crea OT)"
    ↓
Sistema pregunta confirmación
    ↓
Backend:
  1. Cambia estado: pendiente → aprobada
  2. Crea automáticamente Orden de Trabajo (OT)
  3. Asigna supervisor_id (quien aprobó)
  4. Envía WhatsApp al chofer: "✅ Aprobada, OT #X creada"
  5. Libera conversación (puede crear nueva solicitud)
    ↓
Frontend:
  - Muestra éxito con número de OT
  - Actualiza lista de solicitudes
  - Solicitud ahora aparece como "aprobada"
  - Botón cambia a: "🔧 Ver Orden de Trabajo #X"
```

**Resultado:**
- Solicitud: `estado = 'aprobada'`
- OT: `estado = 'asignada'` (lista para asignar mecánico)
- Chofer: Recibe confirmación por WhatsApp

---

#### 🔴 **CAMINO B: IA Clasificó MAL → RECHAZAR**

```
Supervisor hace click en "❌ Rechazar (para editar)"
    ↓
Modal solicita motivo del rechazo
    ↓
Supervisor escribe: "IA clasificó como 'falla_eléctrica' pero es problema de neumáticos"
    ↓
Backend:
  1. Cambia estado: pendiente → rechazada
  2. Guarda motivo en notas_supervisor
  3. NO notifica al chofer (es rechazo interno)
  4. Libera conversación
    ↓
Frontend:
  - Solicitud marcada como "rechazada"
  - Nuevos botones aparecen:
    • "✏️ Editar Clasificación"
    • "✅ Re-aprobar (crea OT)"
```

### 4️⃣ Editar Solicitud Rechazada

```
Supervisor hace click en "✏️ Editar Clasificación"
    ↓
Modal de edición se abre con:
  - Tipo de problema (desplegable)
  - Prioridad (desplegable)
  - Descripción (textarea)
  - Notas del supervisor (textarea)
    ↓
Supervisor corrige los datos:
  Tipo: falla_eléctrica → neumaticos
  Prioridad: media → urgente
  Descripción: (ajusta si es necesario)
    ↓
Click en "💾 Guardar y Listo para Aprobar"
    ↓
Backend:
  1. Valida que estado = 'rechazada'
  2. Actualiza tipo, prioridad, descripción
  3. Agrega nota: "[EDITADA MANUALMENTE] + notas"
  4. Solicitud sigue en estado "rechazada"
    ↓
Frontend:
  - Muestra éxito: "Ahora puedes aprobarla para crear la OT"
  - Recarga datos
  - Botón "✅ Re-aprobar (crea OT)" ahora disponible
```

### 5️⃣ Re-aprobar Solicitud Editada

```
Supervisor hace click en "✅ Re-aprobar (crea OT)"
    ↓
Sistema pregunta confirmación
    ↓
Backend:
  1. Cambia estado: rechazada → aprobada
  2. Crea OT con datos corregidos
  3. Envía WhatsApp al chofer
  4. Libera conversación
    ↓
Frontend:
  - Muestra éxito con número de OT
  - Solicitud ahora "aprobada"
  - Listo para asignar mecánico
```

---

## 🔐 PERMISOS Y ROLES

### Pueden Aprobar/Rechazar/Editar:
- ✅ **Supervisores** (`rol = 'supervisor'`)
- ✅ **Administradores** (`rol = 'admin'`)

### NO Pueden:
- ❌ **Choferes** (`rol = 'chofer'`) - Solo ven sus solicitudes
- ❌ **Mecánicos** (`rol = 'mecanico'`) - Solo ven OT asignadas

---

## 📡 ENDPOINTS BACKEND

### 1. Aprobar Solicitud
```http
PUT /api/solicitudes/:id/aprobar
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "notas_supervisor": "Aprobado desde el dashboard" // opcional
}

Response:
{
  "message": "Solicitud aprobada y Orden de Trabajo creada exitosamente",
  "solicitud": { ... },
  "orden_trabajo": {
    "id": 5,
    "solicitud_id": 123,
    "supervisor_id": 2,
    "estado": "asignada",
    ...
  }
}
```

### 2. Rechazar Solicitud
```http
PUT /api/solicitudes/:id/rechazar
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "motivo_rechazo": "IA clasificó mal el tipo de problema" // obligatorio
}

Response:
{
  "message": "Solicitud marcada como rechazada. Ahora puedes editarla manualmente y re-aprobarla.",
  "solicitud": { ... }
}
```

### 3. Editar Solicitud Rechazada
```http
PUT /api/solicitudes/:id/editar
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "tipo": "neumaticos",                  // opcional
  "prioridad": "urgente",                // opcional
  "descripcion": "Pinchazo en rueda...", // opcional
  "vehiculo_id": 5,                      // opcional
  "notas_supervisor": "Corregido manual" // opcional
}

Response:
{
  "message": "Solicitud editada correctamente. Ahora puedes aprobarla para crear la OT.",
  "solicitud": { ... }
}
```

---

## 🎨 INTERFAZ FRONTEND

### Vista de Solicitudes
```
┌─────────────────────────────────────────────────────────┐
│ Solicitudes de Mantenimiento                           │
├─────────────────────────────────────────────────────────┤
│ ID  | Fecha | Vehículo | Descripción | Estado | Fotos  │
├─────────────────────────────────────────────────────────┤
│ 123 | 10:30 | AA1234   | Pinchazo... | ⏳ Pendiente | 📸 2 │
│ 124 | 11:45 | BB5678   | Motor...    | ✅ Aprobada | 📸 3 │
│ 125 | 12:00 | CC9999   | Frenos...   | ❌ Rechazada | 📸 1 │
└─────────────────────────────────────────────────────────┘
```

### Modal de Detalle - PENDIENTE
```
┌──────────────────────────────────────────┐
│ Solicitud #123                      [×]  │
├──────────────────────────────────────────┤
│ 📋 Información General                   │
│ Estado: ⏳ Pendiente                     │
│ Prioridad: 🔴 Urgente                   │
│ Vehículo: AA1234                         │
│                                          │
│ 📝 Descripción del Problema              │
│ "Tengo un pinchazo..."                  │
│                                          │
│ 🤖 Clasificación IA                      │
│ Tipo: neumaticos                         │
│ Resumen: Pinchazo en neumático          │
│                                          │
│ 📸 Evidencias (2)                        │
│ [Foto1] [Foto2]                          │
├──────────────────────────────────────────┤
│ [✅ Aprobar (crea OT)]  [❌ Rechazar]   │
│ [       Cerrar       ]                   │
└──────────────────────────────────────────┘
```

### Modal de Detalle - RECHAZADA
```
┌──────────────────────────────────────────┐
│ Solicitud #125                      [×]  │
├──────────────────────────────────────────┤
│ Estado: ❌ Rechazada                     │
│ Motivo: "IA clasificó mal..."            │
│                                          │
│ (... resto de datos ...)                 │
├──────────────────────────────────────────┤
│ [✏️ Editar]  [✅ Re-aprobar (crea OT)]  │
│ [         Cerrar        ]                │
└──────────────────────────────────────────┘
```

### Modal de Edición
```
┌──────────────────────────────────────────┐
│ ✏️ Editar Clasificación            [×]  │
├──────────────────────────────────────────┤
│ Tipo de Problema *                       │
│ [v neumaticos ▼]                         │
│                                          │
│ Prioridad *                              │
│ [v urgente ▼]                            │
│                                          │
│ Descripción *                            │
│ [Pinchazo en rueda delantera...]        │
│                                          │
│ Notas del Supervisor                     │
│ [Corregido manualmente...]               │
├──────────────────────────────────────────┤
│ [Cancelar] [💾 Guardar y Listo]         │
└──────────────────────────────────────────┘
```

---

## 🔔 NOTIFICACIONES WHATSAPP

### Al Aprobar
```
✅ SOLICITUD APROBADA

Tu solicitud #123 ha sido aprobada.

📋 Detalles:
Vehículo: AA1234
Problema: neumaticos
Prioridad: URGENTE

💬 Notas del supervisor:
Aprobado desde el dashboard

🔧 Se creó la Orden de Trabajo #5
Pronto será asignada a un mecánico y recibirás actualizaciones.
```

### Al Rechazar (NO se envía)
- El rechazo es interno para corrección
- Solo se notifica cuando se re-apruebe

---

## 📊 ESTADOS DE SOLICITUD

| Estado | Significado | Acciones Disponibles |
|--------|-------------|---------------------|
| `pendiente` | Recién creada por WhatsApp | Aprobar, Rechazar |
| `aprobada` | Aprobada por supervisor | Ver OT, Asignar Mecánico |
| `rechazada` | Clasificación IA incorrecta | Editar, Re-aprobar |
| `en_proceso` | OT en progreso | (futuro) |
| `completada` | OT finalizada | (futuro) |
| `cancelada` | Cancelada por algún motivo | (futuro) |

---

## 🧪 FLUJO DE TESTING

### Test 1: Aprobar Solicitud Pendiente
1. Crear solicitud desde WhatsApp
2. Login como supervisor
3. Ir a Solicitudes → Abrir detalle
4. Click "✅ Aprobar"
5. Verificar:
   - ✅ Mensaje de éxito con número de OT
   - ✅ Solicitud cambia a "aprobada"
   - ✅ OT creada en tabla `ordenes_trabajo`
   - ✅ WhatsApp enviado al chofer
   - ✅ Botón cambia a "Ver OT"

### Test 2: Rechazar y Editar
1. Abrir solicitud pendiente
2. Click "❌ Rechazar"
3. Escribir motivo: "IA clasificó mal"
4. Confirmar
5. Verificar:
   - ✅ Estado cambia a "rechazada"
   - ✅ Aparecen botones "Editar" y "Re-aprobar"
6. Click "✏️ Editar"
7. Cambiar tipo y prioridad
8. Guardar
9. Verificar:
   - ✅ Datos actualizados
   - ✅ Notas agregadas
10. Click "✅ Re-aprobar"
11. Verificar:
    - ✅ OT creada con datos corregidos
    - ✅ WhatsApp enviado

### Test 3: Permisos
1. Login como chofer
2. Abrir detalle de solicitud
3. Verificar:
   - ❌ Botones de Aprobar/Rechazar NO visibles
   - ✅ Solo puede ver datos

---

## 🚀 PRÓXIMOS PASOS

### Mejoras Futuras:
1. **Asignar mecánico** directamente al aprobar
2. **Pestañas de filtrado** (Pendientes / Aprobadas / Rechazadas)
3. **Estadísticas** de aprobación vs rechazo
4. **Notificaciones push** en tiempo real
5. **Historial de ediciones** (auditoría)
6. **Bulk actions** (aprobar múltiples)

---

## 📝 CHANGELOG

### v1.0 - 2025-10-22
- ✅ Implementado sistema de aprobación automática con creación de OT
- ✅ Implementado rechazo con edición posterior
- ✅ Endpoint PUT /solicitudes/:id/aprobar
- ✅ Endpoint PUT /solicitudes/:id/rechazar
- ✅ Endpoint PUT /solicitudes/:id/editar
- ✅ Modal de rechazo con motivo obligatorio
- ✅ Modal de edición completo
- ✅ Botones condicionales según estado
- ✅ Notificaciones WhatsApp
- ✅ Control de permisos por rol

---

## 🎓 CONCLUSIÓN

Este sistema permite:
- ⚡ **Agilizar** aprobaciones (OT automática)
- 🎯 **Corregir** errores de clasificación IA
- 📊 **Mantener** trazabilidad completa
- 🔒 **Controlar** acceso por roles
- 📱 **Notificar** a choferes en tiempo real

**Resultado:** Flujo completo desde WhatsApp hasta OT sin intervención manual innecesaria.
