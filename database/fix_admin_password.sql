-- Fix admin password to admin123
UPDATE usuarios 
SET password_hash = '$2b$10$LgJYvwhfA2GbKe5Vdlyj7enLrUCG3TG6mklED3Meaa/Spwjjg2nN2' 
WHERE email = 'admin@pepsico.cl';

-- Verify the update
SELECT email, LEFT(password_hash, 30) as password_preview, rol 
FROM usuarios 
WHERE email = 'admin@pepsico.cl';
