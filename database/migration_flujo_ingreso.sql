-- ============================================
-- MIGRACIÓN: Agregar flujo de ingreso guiado
-- Fecha: 2025-10-22
-- ============================================

USE pepsico_fleet;

-- Agregar columna para estados de ingreso
ALTER TABLE conversaciones 
ADD COLUMN estado_ingreso ENUM('inicial', 'esperando_patente', 'esperando_problema', 'confirmacion', 'completado') 
DEFAULT 'inicial' 
AFTER estado;

-- Agregar columna para datos temporales del ingreso
ALTER TABLE conversaciones 
ADD COLUMN datos_ingreso_temp JSON NULL 
COMMENT 'Almacena temporalmente: {patente, problema, fotos[]}' 
AFTER estado_ingreso;

-- Verificar cambios
DESCRIBE conversaciones;

SELECT 'Migración completada exitosamente' AS resultado;
