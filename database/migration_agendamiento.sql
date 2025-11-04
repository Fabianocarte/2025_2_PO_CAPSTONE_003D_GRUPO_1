-- ============================================
-- SCRIPT DE MIGRACIÓN PARA SISTEMA DE AGENDAMIENTO
-- Fecha: November 3, 2025
-- ============================================

-- Crear tabla citas_taller
CREATE TABLE IF NOT EXISTS citas_taller (
    id INT PRIMARY KEY AUTO_INCREMENT,
    solicitud_id INT NOT NULL,
    mecanico_id INT NOT NULL,
    fecha_cita DATE NOT NULL,
    hora_cita TIME NOT NULL,
    duracion_estimada INT DEFAULT 30 COMMENT 'Duración en minutos',
    estado_cita ENUM('programada', 'confirmada', 'en_proceso', 'completada', 'cancelada') DEFAULT 'programada',
    tipo_agendamiento ENUM('automatico', 'manual') DEFAULT 'automatico',
    notas_agendamiento TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Claves foráneas
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
    FOREIGN KEY (mecanico_id) REFERENCES usuarios(id),
    
    -- Índices para rendimiento
    INDEX idx_mecanico_fecha (mecanico_id, fecha_cita),
    INDEX idx_solicitud (solicitud_id),
    INDEX idx_fecha_hora (fecha_cita, hora_cita),
    
    -- Evitar citas duplicadas en el mismo horario para el mismo mecánico
    UNIQUE KEY unique_mecanico_horario (mecanico_id, fecha_cita, hora_cita)
);

-- Agregar campo cita_id a ordenes_trabajo para vincular
ALTER TABLE ordenes_trabajo 
ADD COLUMN cita_id INT NULL,
ADD FOREIGN KEY fk_orden_cita (cita_id) REFERENCES citas_taller(id);

-- Verificar que la tabla se creó correctamente
SELECT 'Tabla citas_taller creada exitosamente' as resultado;

-- Mostrar estructura de la nueva tabla
DESCRIBE citas_taller;