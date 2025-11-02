const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const { verificarToken } = require('../middleware/auth');

router.use(verificarToken);

router.get('/', usuariosController.listarUsuarios);
router.put('/perfil', usuariosController.actualizarPerfil);
router.put('/cambiar-password', usuariosController.cambiarPassword);

module.exports = router;
