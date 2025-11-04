# 📅 Sistema de Agendamiento Automático - PepsiCo Fleet Management

## 🎯 Descripción General

El Sistema de Agendamiento permite gestionar automáticamente las citas de ingreso de vehículos al taller, asignando mecánicos y horarios de forma inteligente basada en la prioridad de las solicitudes.

## ⚡ Características Principales

### ✅ **Agendamiento Automático**
- **Creación automática** de citas al aprobar solicitudes
- **Asignación inteligente** de mecánicos basada en carga de trabajo
- **Slots de 30 minutos** de 8:00 a 18:00 (excluyendo almuerzo 12:00-14:00)
- **Priorización**: Urgente (1 día), Alta (3 días), Media/Baja (7 días)

### 👥 **Roles y Permisos**
- **Admin**: Acceso completo, puede ver y modificar cualquier cita
- **Supervisor**: Acceso completo, puede ver y modificar cualquier cita  
- **Mecánico**: Ve solo sus citas, puede cambiar estados (programada → en_proceso → completada)

### 📅 **Vista Calendario Semanal**
- **Grid de 7 columnas** (Lunes a Domingo)
- **Navegación entre semanas**
- **Información detallada** de cada cita
- **Colores por prioridad** (rojo=urgente, naranja=alta, azul=media, gris=baja)
- **Responsive design** que se adapta a móviles

## 🔄 Flujo de Funcionamiento

### 1. **Aprobación → Agendamiento Automático**
```
Chofer reporta problema (WhatsApp) 
    ↓
IA clasifica y crea solicitud
    ↓
Supervisor/Admin aprueba solicitud
    ↓
🆕 Sistema agenda automáticamente:
    - Busca mecánico menos ocupado
    - Encuentra próximo slot disponible
    - Crea cita con duración 30 min
    - Asigna mecánico a la OT
    ↓
Notifica al chofer por WhatsApp con fecha/hora
```

### 2. **Gestión Diaria del Mecánico**
```
Mecánico accede a "Mi Agenda"
    ↓
Ve sus citas del día organizadas por hora
    ↓
Cuando llega el vehículo:
    - Cambia estado a "En Proceso"
    ↓
Al terminar el trabajo:
    - Cambia estado a "Completada"
```

### 3. **Supervisión del Equipo**
```
Admin/Supervisor accede al "Calendario"
    ↓
Ve disponibilidad de TODO el equipo
    ↓
Puede reasignar citas manualmente si es necesario
    ↓
Monitorea carga de trabajo por mecánico
```

## 📊 Estructura de Base de Datos

### Nueva Tabla: `citas_taller`
```sql
CREATE TABLE citas_taller (
    id INT PRIMARY KEY AUTO_INCREMENT,
    solicitud_id INT NOT NULL,
    mecanico_id INT NOT NULL,
    fecha_cita DATE NOT NULL,
    hora_cita TIME NOT NULL,
    duracion_estimada INT DEFAULT 30,
    estado_cita ENUM('programada', 'confirmada', 'en_proceso', 'completada', 'cancelada'),
    tipo_agendamiento ENUM('automatico', 'manual'),
    notas_agendamiento TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Modificación: `ordenes_trabajo`
```sql
ALTER TABLE ordenes_trabajo 
ADD COLUMN cita_id INT NULL,
ADD FOREIGN KEY (cita_id) REFERENCES citas_taller(id);
```

## 🛠️ Instalación y Configuración

### 1. **Ejecutar Migración de Base de Datos**
```bash
# Ejecutar desde el directorio database/
./run-migration-agendamiento.bat
```

### 2. **Verificar Backend**
El backend debe estar corriendo en **puerto 5000**:
```bash
cd backend
npm start
```

### 3. **Verificar Frontend** 
El frontend debe estar corriendo en **puerto 5173**:
```bash
cd frontend
npm run dev
```

### 4. **Nuevas Rutas API**
```
GET  /api/citas/vista-semanal     # Calendario semanal
GET  /api/citas/mis-citas         # Agenda del mecánico
GET  /api/citas/vista-equipo      # Vista supervisor
PUT  /api/citas/:id/estado        # Cambiar estado
POST /api/citas/manual            # Crear cita manual
```

## 🎨 Interfaz de Usuario

### **Para Mecánicos**: `/calendario`
- Lista de citas del día actual
- Botones para cambiar estado
- Vista solo de sus propias citas

### **Para Admin/Supervisor**: `/calendario`
- Vista completa del equipo
- Calendario semanal con navegación
- Estadísticas de carga de trabajo
- Posibilidad de crear citas manuales

## 📱 Notificaciones WhatsApp

Cuando se crea una cita automática, se envía:
```
✅ SOLICITUD APROBADA

Tu solicitud #123 ha sido aprobada.

📋 Detalles:
Vehículo: ABC123
Problema: Frenos
Prioridad: ALTA

📅 Cita Agendada:
Fecha: 04/11/2025
Hora: 08:30
Duración: 30 minutos

🔧 Se creó la Orden de Trabajo #456
Recibirás actualizaciones del progreso.
```

## 🔧 Configuración de Horarios

### **Horarios de Trabajo**
- **Mañana**: 08:00 - 12:00 (8 slots de 30 min)
- **Tarde**: 14:00 - 18:00 (8 slots de 30 min)
- **Total**: 16 slots disponibles por mecánico/día

### **Algoritmo de Asignación**
1. **Buscar mecánico menos ocupado** en próximos 7 días
2. **Aplicar prioridad temporal**:
   - Urgente: buscar hoy o mañana
   - Alta: buscar en próximos 3 días  
   - Media/Baja: buscar en próxima semana
3. **Asignar primer slot disponible** en orden temporal

## 🚀 Características Avanzadas

### ✅ **Prevención de Conflictos**
- **Constraint único** evita doble reserva del mismo slot
- **Validación** antes de crear citas manuales
- **Verificación** de disponibilidad en tiempo real

### ✅ **Balanceado de Carga**
- **Algoritmo inteligente** distribuye trabajo entre mecánicos
- **Estadísticas** de horas ocupadas vs disponibles
- **Indicadores visuales** de disponibilidad

### ✅ **Flexibilidad**
- **Citas manuales** para casos especiales
- **Reasignación** de citas existentes
- **Modificación** de horarios por admin/supervisor

## 📈 Métricas y Monitoreo

### **KPIs Disponibles**
- Citas programadas vs completadas
- Tiempo promedio por reparación
- Utilización de mecánicos
- Distribución de prioridades

### **Estados de Cita**
- **Programada**: Cita creada, esperando vehículo
- **En Proceso**: Mecánico trabajando en el vehículo
- **Completada**: Trabajo terminado
- **Cancelada**: Cita cancelada por algún motivo

## 🔄 Integración con Sistema Existente

El sistema se integra perfectamente con:
- ✅ **Flujo de solicitudes** existente
- ✅ **Sistema de órdenes de trabajo**
- ✅ **Notificaciones WhatsApp**
- ✅ **Gestión de usuarios y roles**
- ✅ **Base de datos existente**

## 🎯 Próximas Mejoras

- [ ] **Recordatorios automáticos** por WhatsApp
- [ ] **Reprogramación automática** en caso de retrasos
- [ ] **Métricas avanzadas** y reportes
- [ ] **Integración con calendario Outlook/Google**
- [ ] **Estimación inteligente** de duración basada en historial