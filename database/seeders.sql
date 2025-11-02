-- ============================================
-- SEEDERS: Datos de prueba para PepsiCo Fleet
-- ============================================

USE pepsico_fleet;

-- ============================================
-- USUARIOS DE PRUEBA
-- Password para todos: "password123" (hash bcrypt)
-- ============================================
INSERT INTO usuarios (nombre, email, telefono, rol, password_hash) VALUES
('Admin Sistema', 'admin@pepsico.cl', '+56912345001', 'admin', '$2b$10$rKz3QXxXYxXxXxXxXxXxXeuPmK9Z1L6K8K8K8K8K8K8K8K8K8K8K8'),
('Juan Supervisor', 'supervisor@pepsico.cl', '+56912345002', 'supervisor', '$2b$10$rKz3QXxXYxXxXxXxXxXxXeuPmK9Z1L6K8K8K8K8K8K8K8K8K8K8K8'),
('Carlos Mecánico', 'mecanico@pepsico.cl', '+56912345003', 'mecanico', '$2b$10$rKz3QXxXYxXxXxXxXxXxXeuPmK9Z1L6K8K8K8K8K8K8K8K8K8K8K8'),
('Pedro González', 'chofer1@pepsico.cl', '+56912345010', 'chofer', '$2b$10$rKz3QXxXYxXxXxXxXxXxXeuPmK9Z1L6K8K8K8K8K8K8K8K8K8K8K8'),
('María Rojas', 'chofer2@pepsico.cl', '+56912345011', 'chofer', '$2b$10$rKz3QXxXYxXxXxXxXxXxXeuPmK9Z1L6K8K8K8K8K8K8K8K8K8K8K8'),
('Luis Morales', 'mecanico2@pepsico.cl', '+56912345012', 'mecanico', '$2b$10$rKz3QXxXYxXxXxXxXxXxXeuPmK9Z1L6K8K8K8K8K8K8K8K8K8K8K8');

-- ============================================
-- VEHÍCULOS DE FLOTA
-- ============================================
INSERT INTO vehiculos (patente, marca, modelo, anio, tipo, kilometraje, estado) VALUES
('AB-1234', 'Mercedes-Benz', 'Actros 2646', 2020, 'Camión', 45000, 'operativo'),
('CD-5678', 'Volvo', 'FH 460', 2019, 'Camión', 78000, 'operativo'),
('EF-9012', 'Scania', 'R450', 2021, 'Camión', 32000, 'operativo'),
('GH-3456', 'Chevrolet', 'N300', 2018, 'Furgón', 95000, 'en_mantenimiento'),
('IJ-7890', 'Hyundai', 'HD78', 2022, 'Camión', 15000, 'operativo'),
('KL-2468', 'Ford', 'Cargo 1722', 2017, 'Camión', 120000, 'operativo'),
('MN-1357', 'Mitsubishi', 'Canter', 2020, 'Furgón', 52000, 'operativo'),
('OP-9753', 'JAC', 'HFC', 2019, 'Camión', 88000, 'operativo');

-- ============================================
-- SOLICITUDES DE EJEMPLO
-- ============================================
INSERT INTO solicitudes (
    chofer_id, vehiculo_id, tipo, descripcion, prioridad, estado, 
    mensaje_original, telefono_origen, clasificacion_ia
) VALUES
(
    4, 1, 'mantenimiento_preventivo', 
    'Hola, necesito agendar el mantenimiento de los 50.000 km para la patente AB-1234',
    'media', 'pendiente',
    'Hola, necesito agendar el mantenimiento de los 50.000 km para la patente AB-1234',
    '+56912345010',
    '{"tipo": "mantenimiento_preventivo", "prioridad": "media", "resumen": "Mantenimiento programado"}'
),
(
    5, 2, 'falla_mecanica',
    'Urgente: El camión CD-5678 está haciendo un ruido extraño en el motor. No puedo continuar viaje.',
    'urgente', 'aprobada',
    'Urgente: El camión CD-5678 está haciendo un ruido extraño en el motor',
    '+56912345011',
    '{"tipo": "falla_mecanica", "prioridad": "urgente", "resumen": "Falla en motor"}'
),
(
    4, 4, 'revision_rutinaria',
    'Buenas, el furgón GH-3456 necesita revisión de frenos antes de salir mañana.',
    'alta', 'en_proceso',
    'Buenas, el furgón GH-3456 necesita revisión de frenos',
    '+56912345010',
    '{"tipo": "revision_rutinaria", "prioridad": "alta", "resumen": "Revisión sistema de frenos"}'
);

-- ============================================
-- ÓRDENES DE TRABAJO
-- ============================================
INSERT INTO ordenes_trabajo (
    solicitud_id, mecanico_id, supervisor_id, 
    fecha_inicio, diagnostico, estado, horas_trabajo
) VALUES
(
    2, 3, 2,
    NOW(),
    'Se detectó falla en correa de distribución. Requiere reemplazo inmediato.',
    'en_proceso',
    2.5
),
(
    3, 6, 2,
    DATE_SUB(NOW(), INTERVAL 1 HOUR),
    'Pastillas de freno delanteras al 20% de vida útil. Se procede a cambio.',
    'en_proceso',
    1.0
);

-- ============================================
-- EVIDENCIAS
-- ============================================
INSERT INTO evidencias (orden_trabajo_id, tipo, url_imagen, descripcion, subido_por) VALUES
(1, 'antes', '/uploads/evidencias/correa_antes.jpg', 'Estado inicial de correa de distribución', 3),
(2, 'antes', '/uploads/evidencias/frenos_antes.jpg', 'Pastillas de freno desgastadas', 6);

-- ============================================
-- NOTIFICACIONES
-- ============================================
INSERT INTO notificaciones (
    usuario_id, telefono, tipo, asunto, mensaje, estado, referencia_tipo, referencia_id
) VALUES
(5, '+56912345011', 'whatsapp', 'Solicitud Aprobada', 
 'Tu solicitud #2 ha sido aprobada. Un mecánico se asignará pronto.', 
 'enviada', 'solicitud', 2),
(3, '+56912345003', 'whatsapp', 'Nueva OT Asignada',
 'Se te ha asignado la Orden de Trabajo #1 para el vehículo CD-5678.',
 'enviada', 'orden_trabajo', 1);

-- ============================================
-- HISTORIAL DE ESTADOS
-- ============================================
INSERT INTO historial_estados (entidad_tipo, entidad_id, estado_anterior, estado_nuevo, usuario_id, comentario) VALUES
('solicitud', 2, 'pendiente', 'aprobada', 2, 'Solicitud aprobada por supervisor - prioridad urgente'),
('solicitud', 3, 'pendiente', 'aprobada', 2, 'Aprobada para revisión inmediata'),
('solicitud', 3, 'aprobada', 'en_proceso', 6, 'Mecánico comenzó revisión'),
('orden_trabajo', 1, 'asignada', 'en_proceso', 3, 'Iniciando diagnóstico'),
('orden_trabajo', 2, 'asignada', 'en_proceso', 6, 'Comenzando cambio de pastillas');

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 'Seeders ejecutados correctamente!' AS mensaje;
SELECT COUNT(*) AS total_usuarios FROM usuarios;
SELECT COUNT(*) AS total_vehiculos FROM vehiculos;
SELECT COUNT(*) AS total_solicitudes FROM solicitudes;
SELECT COUNT(*) AS total_ordenes FROM ordenes_trabajo;
