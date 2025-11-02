-- ============================================
-- ACTUALIZAR PASSWORDS DE USUARIOS DE PRUEBA
-- Nota: Ejecutar DESPUÉS de iniciar el backend
-- ============================================

USE pepsico_fleet;

-- Los passwords hasheados reales se generarán cuando el backend inicie
-- Por ahora, estos son placeholders que deben ser actualizados

-- Para generar nuevos passwords, puedes usar este script Node.js:
-- node -e "const bcrypt = require('bcrypt'); bcrypt.hash('password123', 10, (err, hash) => console.log(hash));"

-- IMPORTANTE: Actualizar estos hashes con los reales después de generar
UPDATE usuarios SET password_hash = '$2b$10$someHashHere' WHERE email = 'admin@pepsico.cl';
UPDATE usuarios SET password_hash = '$2b$10$someHashHere' WHERE email = 'supervisor@pepsico.cl';
UPDATE usuarios SET password_hash = '$2b$10$someHashHere' WHERE email = 'mecanico@pepsico.cl';
UPDATE usuarios SET password_hash = '$2b$10$someHashHere' WHERE email = 'chofer1@pepsico.cl';
UPDATE usuarios SET password_hash = '$2b$10$someHashHere' WHERE email = 'chofer2@pepsico.cl';
UPDATE usuarios SET password_hash = '$2b$10$someHashHere' WHERE email = 'mecanico2@pepsico.cl';
