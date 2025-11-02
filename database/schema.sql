-- ============================================
-- SCHEMA: Plataforma PepsiCo Fleet Management
-- Versión: 1.0
-- Fecha: 2025-10-18
-- ============================================

DROP DATABASE IF EXISTS pepsico_fleet;
CREATE DATABASE pepsico_fleet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pepsico_fleet;

-- ============================================
-- TABLA: usuarios
-- Descripción: Almacena todos los usuarios del sistema (choferes, supervisores, mecánicos, admins)
-- ============================================
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    rol ENUM('chofer', 'supervisor', 'mecanico', 'admin') NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_rol (rol),
    INDEX idx_telefono (telefono)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: vehiculos
-- Descripción: Registro de vehículos de la flota
-- ============================================
CREATE TABLE vehiculos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patente VARCHAR(10) UNIQUE NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    anio INT NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- camión, furgón, auto, etc.
    kilometraje INT DEFAULT 0,
    estado ENUM('operativo', 'en_mantenimiento', 'fuera_servicio') DEFAULT 'operativo',
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_patente (patente),
    INDEX idx_estado (estado)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: solicitudes
-- Descripción: Solicitudes de ingreso/mantenimiento enviadas por choferes (principalmente vía WhatsApp)
-- ============================================
CREATE TABLE solicitudes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    chofer_id INT,
    vehiculo_id INT,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tipo VARCHAR(100), -- Clasificación IA: mantenimiento_preventivo, reparacion_urgente, etc.
    descripcion TEXT NOT NULL,
    prioridad ENUM('baja', 'media', 'alta', 'urgente') DEFAULT 'media',
    estado ENUM('pendiente', 'aprobada', 'rechazada', 'en_proceso', 'completada', 'cancelada') DEFAULT 'pendiente',
    imagenes JSON, -- Array de URLs de fotos
    mensaje_original TEXT, -- Mensaje completo de WhatsApp
    telefono_origen VARCHAR(20), -- Número de WhatsApp del remitente
    clasificacion_ia JSON, -- Respuesta completa de OpenAI
    notas_supervisor TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (chofer_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE,
    INDEX idx_estado (estado),
    INDEX idx_prioridad (prioridad),
    INDEX idx_fecha (fecha_hora),
    INDEX idx_chofer (chofer_id)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: ordenes_trabajo
-- Descripción: Órdenes de Trabajo (OT) generadas desde solicitudes aprobadas
-- ============================================
CREATE TABLE ordenes_trabajo (
    id INT PRIMARY KEY AUTO_INCREMENT,
    solicitud_id INT NOT NULL,
    mecanico_id INT,
    supervisor_id INT,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_inicio TIMESTAMP NULL,
    fecha_fin TIMESTAMP NULL,
    diagnostico TEXT,
    trabajo_realizado TEXT,
    repuestos_usados JSON, -- [{ "nombre": "Filtro aceite", "cantidad": 1, "costo": 15000 }]
    costo_total DECIMAL(10,2) DEFAULT 0,
    horas_trabajo DECIMAL(5,2) DEFAULT 0,
    estado ENUM('asignada', 'en_proceso', 'completada', 'pausada', 'cancelada') DEFAULT 'asignada',
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
    FOREIGN KEY (mecanico_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (supervisor_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_estado (estado),
    INDEX idx_mecanico (mecanico_id),
    INDEX idx_solicitud (solicitud_id)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: evidencias
-- Descripción: Fotos y documentos asociados a las órdenes de trabajo
-- ============================================
CREATE TABLE evidencias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    orden_trabajo_id INT NOT NULL,
    tipo ENUM('antes', 'durante', 'despues', 'repuesto') DEFAULT 'durante',
    url_imagen VARCHAR(500) NOT NULL,
    descripcion TEXT,
    subido_por INT, -- Usuario que subió la evidencia
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (orden_trabajo_id) REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
    FOREIGN KEY (subido_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_orden (orden_trabajo_id),
    INDEX idx_tipo (tipo)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: notificaciones
-- Descripción: Log de notificaciones enviadas vía WhatsApp u otros medios
-- ============================================
CREATE TABLE notificaciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT,
    telefono VARCHAR(20),
    tipo ENUM('whatsapp', 'email', 'sms') DEFAULT 'whatsapp',
    asunto VARCHAR(200),
    mensaje TEXT NOT NULL,
    estado ENUM('enviada', 'fallida', 'pendiente') DEFAULT 'pendiente',
    referencia_tipo VARCHAR(50), -- 'solicitud', 'orden_trabajo'
    referencia_id INT,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_usuario (usuario_id),
    INDEX idx_estado (estado),
    INDEX idx_fecha (fecha_envio)
) ENGINE=InnoDB;

-- ============================================
-- TABLA: historial_estados
-- Descripción: Auditoría de cambios de estado en solicitudes y OT
-- ============================================
CREATE TABLE historial_estados (
    id INT PRIMARY KEY AUTO_INCREMENT,
    entidad_tipo ENUM('solicitud', 'orden_trabajo') NOT NULL,
    entidad_id INT NOT NULL,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50) NOT NULL,
    usuario_id INT, -- Quién hizo el cambio
    comentario TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_entidad (entidad_tipo, entidad_id),
    INDEX idx_fecha (fecha)
) ENGINE=InnoDB;

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Solicitudes con información completa
CREATE VIEW vista_solicitudes_completas AS
SELECT 
    s.id,
    s.fecha_hora,
    s.tipo,
    s.descripcion,
    s.prioridad,
    s.estado,
    u.nombre AS chofer_nombre,
    u.telefono AS chofer_telefono,
    v.patente,
    v.marca,
    v.modelo,
    s.imagenes,
    s.created_at
FROM solicitudes s
LEFT JOIN usuarios u ON s.chofer_id = u.id
LEFT JOIN vehiculos v ON s.vehiculo_id = v.id;

-- Vista: OTs con detalles
CREATE VIEW vista_ordenes_completas AS
SELECT 
    ot.id,
    ot.estado,
    ot.fecha_asignacion,
    ot.fecha_inicio,
    ot.fecha_fin,
    ot.costo_total,
    ot.horas_trabajo,
    m.nombre AS mecanico_nombre,
    sup.nombre AS supervisor_nombre,
    v.patente,
    v.marca,
    v.modelo,
    s.descripcion AS solicitud_descripcion,
    s.prioridad
FROM ordenes_trabajo ot
LEFT JOIN usuarios m ON ot.mecanico_id = m.id
LEFT JOIN usuarios sup ON ot.supervisor_id = sup.id
LEFT JOIN solicitudes s ON ot.solicitud_id = s.id
LEFT JOIN vehiculos v ON s.vehiculo_id = v.id;

-- ============================================
-- COMENTARIOS FINALES
-- ============================================
-- Este schema está diseñado para:
-- 1. Escalabilidad (índices en columnas clave)
-- 2. Trazabilidad (historial de estados)
-- 3. Integridad referencial (foreign keys)
-- 4. Auditoría (timestamps en todas las tablas)
