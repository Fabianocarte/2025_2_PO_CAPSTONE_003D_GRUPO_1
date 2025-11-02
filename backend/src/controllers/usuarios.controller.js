const { Usuario } = require('../models');
const bcrypt = require('bcryptjs');

const listarUsuarios = async (req, res) => {
    try {
        const { rol } = req.query;
        
        const where = {};
        if (rol) where.rol = rol;

        const usuarios = await Usuario.findAll({
            where,
            attributes: { exclude: ['password_hash'] },
            order: [['nombre', 'ASC']]
        });

        res.json({
            total: usuarios.length,
            usuarios
        });
    } catch (error) {
        console.error('Error listando usuarios:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

/**
 * Actualizar perfil del usuario autenticado
 */
const actualizarPerfil = async (req, res) => {
    try {
        const { id } = req.usuario;
        const { nombre, email, telefono } = req.body;

        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar si el email ya está en uso por otro usuario
        if (email && email !== usuario.email) {
            const emailExiste = await Usuario.findOne({ 
                where: { email },
                attributes: ['id']
            });
            if (emailExiste && emailExiste.id !== id) {
                return res.status(400).json({ error: 'El email ya está en uso' });
            }
        }

        // Actualizar datos
        await usuario.update({
            nombre: nombre || usuario.nombre,
            email: email || usuario.email,
            telefono: telefono || usuario.telefono
        });

        res.json({
            success: true,
            message: 'Perfil actualizado correctamente',
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                telefono: usuario.telefono,
                rol: usuario.rol
            }
        });
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

/**
 * Cambiar contraseña del usuario autenticado
 */
const cambiarPassword = async (req, res) => {
    try {
        const { id } = req.usuario;
        const { password_actual, password_nueva } = req.body;

        if (!password_actual || !password_nueva) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }

        if (password_nueva.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }

        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar contraseña actual
        const passwordValida = await bcrypt.compare(password_actual, usuario.password_hash);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }

        // Hashear nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password_nueva, salt);

        // Actualizar contraseña (sin hooks para evitar doble hash)
        await usuario.update({ password_hash }, { hooks: false });

        res.json({
            success: true,
            message: 'Contraseña actualizada correctamente'
        });
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

module.exports = {
    listarUsuarios,
    actualizarPerfil,
    cambiarPassword
};
