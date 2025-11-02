-- ============================================
-- MIGRATION: Sistema de Gestión de Conversaciones
-- ============================================
-- Autor: Sistema
-- Fecha: 2025-10-20
-- Descripción: Agregar tablas para gestionar contexto de conversaciones
--              y prevenir duplicación de solicitudes

-- ============================================
-- TABLA: conversaciones
-- ============================================
CREATE TABLE IF NOT EXISTS conversaciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    telefono VARCHAR(20) NOT NULL UNIQUE,
    chofer_id INT,
    estado ENUM('activa', 'esperando_info', 'cerrada') DEFAULT 'activa',
    ultimo_saludo DATETIME,
    resumen_conversacion TEXT COMMENT 'Resumen del contexto de la conversación',
    ultimo_mensaje DATETIME,
    mensajes_sin_incidencia INT DEFAULT 0 COMMENT 'Contador de mensajes que no son incidencias',
    tiene_solicitud_activa BOOLEAN DEFAULT FALSE,
    solicitud_activa_id INT COMMENT 'ID de la solicitud actualmente en proceso',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (chofer_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (solicitud_activa_id) REFERENCES solicitudes(id) ON DELETE SET NULL,
    
    INDEX idx_telefono (telefono),
    INDEX idx_estado (estado),
    INDEX idx_ultimo_mensaje (ultimo_mensaje)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: historial_mensajes
-- ============================================
CREATE TABLE IF NOT EXISTS historial_mensajes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversacion_id INT NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    tipo ENUM('entrante', 'saliente') NOT NULL COMMENT 'entrante=del chofer, saliente=del bot',
    mensaje TEXT,
    tiene_imagenes BOOLEAN DEFAULT FALSE,
    numero_imagenes INT DEFAULT 0,
    fue_incidencia BOOLEAN DEFAULT FALSE COMMENT 'Si el mensaje generó una solicitud',
    metadata JSON COMMENT 'Información adicional del mensaje',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversacion_id) REFERENCES conversaciones(id) ON DELETE CASCADE,
    
    INDEX idx_conversacion (conversacion_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DATOS INICIALES
-- ============================================
-- Crear conversaciones para solicitudes existentes
INSERT IGNORE INTO conversaciones (telefono, chofer_id, estado, ultimo_mensaje, tiene_solicitud_activa, solicitud_activa_id)
SELECT DISTINCT 
    s.telefono_origen,
    s.chofer_id,
    CASE 
        WHEN s.estado IN ('pendiente', 'en_proceso', 'esperando_repuesto') THEN 'activa'
        ELSE 'cerrada'
    END,
    s.fecha_hora,
    s.estado IN ('pendiente', 'en_proceso', 'esperando_repuesto'),
    s.id
FROM solicitudes s
WHERE s.telefono_origen IS NOT NULL
ORDER BY s.fecha_hora DESC;

-- ============================================
-- COMENTARIOS
-- ============================================
-- Esta migración permite:
-- 1. Mantener contexto de conversación entre mensajes
-- 2. Prevenir duplicación de solicitudes (1 OT activa por chofer)
-- 3. Recordar si ya saludó al chofer
-- 4. Guardar resumen de la conversación para la IA
-- 5. Historial completo de mensajes para análisis
-- 6. Identificar trabajadores por su historial de conversaciones

-- ⚠️ IMPORTANTE: Las conversaciones NUNCA se borran
-- Solo cambian de estado (activa → cerrada) pero se mantienen
-- en la BD para mantener el historial completo del trabajador

-- Para ejecutar:
-- mysql -u root -p pepsico_fleet < migration_conversaciones.sql
