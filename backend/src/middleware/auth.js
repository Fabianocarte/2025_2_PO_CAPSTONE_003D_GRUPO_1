const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

/**
 * Middleware para verificar JWT
 */
const verificarToken = async (req, res, next) => {
    try {
        // Obtener token del header
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                error: 'Token no proporcionado'
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Buscar usuario
        const usuario = await Usuario.findByPk(decoded.id);
        
        if (!usuario || !usuario.activo) {
            return res.status(401).json({
                error: 'Usuario no válido o inactivo'
            });
        }

        // Adjuntar usuario al request
        req.usuario = usuario;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token inválido' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado' });
        }
        return res.status(500).json({ error: 'Error al verificar token' });
    }
};

/**
 * Middleware para verificar roles
 * @param  {...string} rolesPermitidos - Roles que tienen acceso
 */
const verificarRol = (...rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({
                error: 'No tienes permisos para realizar esta acción',
                rol_requerido: rolesPermitidos,
                tu_rol: req.usuario.rol
            });
        }

        next();
    };
};

/**
 * Middleware para verificar JWT en SSE (acepta token por query param)
 */
const verificarTokenSSE = async (req, res, next) => {
    try {
        // Obtener token del header o query param
        let token = req.headers.authorization?.split(' ')[1];
        
        if (!token && req.query.token) {
            token = req.query.token;
        }
        
        if (!token) {
            return res.status(401).json({
                error: 'Token no proporcionado'
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Buscar usuario
        const usuario = await Usuario.findByPk(decoded.id);
        
        if (!usuario || !usuario.activo) {
            return res.status(401).json({
                error: 'Usuario no válido o inactivo'
            });
        }

        // Adjuntar usuario al request
        req.usuario = usuario;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token inválido' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado' });
        }
        return res.status(500).json({ error: 'Error al verificar token' });
    }
};

module.exports = {
    verificarToken,
    verificarRol,
    verificarTokenSSE
};
