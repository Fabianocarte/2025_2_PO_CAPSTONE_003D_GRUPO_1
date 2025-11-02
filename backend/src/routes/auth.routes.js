const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verificarToken, verificarRol } = require('../middleware/auth');

/**
 * @route   POST /api/auth/login
 * @desc    Login de usuario
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   GET /api/auth/profile
 * @desc    Obtener perfil del usuario autenticado
 * @access  Private
 */
router.get('/profile', verificarToken, authController.getProfile);

/**
 * @route   POST /api/auth/register
 * @desc    Registrar nuevo usuario (solo admin)
 * @access  Private (Admin)
 */
router.post('/register', verificarToken, verificarRol('admin'), authController.register);

module.exports = router;
