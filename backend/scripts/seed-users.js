require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize } = require('../src/config/database');
const { Usuario } = require('../src/models');

/**
 * Script para generar usuarios de prueba con passwords hasheados correctamente
 */
async function crearUsuariosPrueba() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a la base de datos');

        const password = 'password123';
        const passwordHash = await bcrypt.hash(password, 10);

        const usuarios = [
            {
                nombre: 'Admin Sistema',
                email: 'admin@pepsico.cl',
                telefono: '+56912345001',
                rol: 'admin',
                password_hash: passwordHash
            },
            {
                nombre: 'Juan Supervisor',
                email: 'supervisor@pepsico.cl',
                telefono: '+56912345002',
                rol: 'supervisor',
                password_hash: passwordHash
            },
            {
                nombre: 'Carlos Mecánico',
                email: 'mecanico@pepsico.cl',
                telefono: '+56912345003',
                rol: 'mecanico',
                password_hash: passwordHash
            },
            {
                nombre: 'Pedro González',
                email: 'chofer1@pepsico.cl',
                telefono: '+56912345010',
                rol: 'chofer',
                password_hash: passwordHash
            },
            {
                nombre: 'María Rojas',
                email: 'chofer2@pepsico.cl',
                telefono: '+56912345011',
                rol: 'chofer',
                password_hash: passwordHash
            }
        ];

        for (const userData of usuarios) {
            // Verificar si ya existe
            const existe = await Usuario.findOne({ where: { email: userData.email } });
            
            if (existe) {
                // Actualizar password
                existe.password_hash = passwordHash;
                await existe.save({ hooks: false }); // Sin hooks para no hashear de nuevo
                console.log(`✅ Password actualizado: ${userData.email}`);
            } else {
                // Crear nuevo
                await Usuario.create(userData, { hooks: false });
                console.log(`✅ Usuario creado: ${userData.email}`);
            }
        }

        console.log('\n🎉 Todos los usuarios de prueba están listos!');
        console.log('📋 Credenciales:');
        console.log('   Email: [cualquier usuario]@pepsico.cl');
        console.log('   Password: password123');
        
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

crearUsuariosPrueba();
