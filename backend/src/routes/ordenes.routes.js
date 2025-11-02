const express = require('express');
const router = express.Router();
const ordenesController = require('../controllers/ordenes.controller');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);

/**
 * @route   GET /api/ordenes
 * @desc    Listar órdenes de trabajo
 * @access  Private (Todos los roles)
 */
router.get('/', ordenesController.listarOrdenes);

/**
 * @route   POST /api/ordenes
 * @desc    Crear orden de trabajo
 * @access  Private (Supervisor, Admin)
 */
router.post('/', verificarRol('supervisor', 'admin'), ordenesController.crearOrden);

/**
 * @route   PUT /api/ordenes/:id
 * @desc    Actualizar orden de trabajo
 * @access  Private (Mecánico, Supervisor, Admin)
 */
router.put('/:id', verificarRol('mecanico', 'supervisor', 'admin'), ordenesController.actualizarOrden);

/**
 * @route   DELETE /api/ordenes/:id
 * @desc    Eliminar orden de trabajo (TESTING)
 * @access  Private (Supervisor, Admin)
 */
router.delete('/:id', verificarRol('supervisor', 'admin'), ordenesController.eliminarOrden);

module.exports = router;
