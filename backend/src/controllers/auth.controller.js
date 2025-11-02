const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

/**
 * Login de usuario
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar campos
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email y password son requeridos'
            });
        }

        // Buscar usuario
        const usuario = await Usuario.findOne({ where: { email } });

        if (!usuario) {
            return res.status(401).json({
                error: 'Credenciales inválidas'
            });
        }

        // Verificar password
        const passwordValido = await usuario.validarPassword(password);

        if (!passwordValido) {
            return res.status(401).json({
                error: 'Credenciales inválidas'
            });
        }

        // Verificar si está activo
        if (!usuario.activo) {
            return res.status(403).json({
                error: 'Usuario inactivo. Contacta al administrador.'
            });
        }

        // Generar JWT
        const token = jwt.sign(
            { 
                id: usuario.id, 
                email: usuario.email, 
                rol: usuario.rol 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Respuesta
        res.json({
            message: 'Login exitoso',
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol,
                telefono: usuario.telefono
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

/**
 * Obtener perfil del usuario autenticado
 */
const getProfile = async (req, res) => {
    try {
        res.json({
            usuario: req.usuario
        });
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

/**
 * Registro de nuevo usuario (solo admin)
 */
const register = async (req, res) => {
    try {
        const { nombre, email, telefono, rol, password } = req.body;

        // Validar campos requeridos
        if (!nombre || !email || !rol || !password) {
            return res.status(400).json({
                error: 'Todos los campos son requeridos'
            });
        }

        // Verificar si el email ya existe
        const usuarioExistente = await Usuario.findOne({ where: { email } });
        if (usuarioExistente) {
            return res.status(400).json({
                error: 'El email ya está registrado'
            });
        }

        // Crear usuario
        const nuevoUsuario = await Usuario.create({
            nombre,
            email,
            telefono,
            rol,
            password_hash: password
        });

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            usuario: nuevoUsuario
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

module.exports = {
    login,
    getProfile,
    register
};
