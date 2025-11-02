const express = require('express');
const router = express.Router();
const solicitudesController = require('../controllers/solicitudes.controller');
const { verificarToken, verificarRol } = require('../middleware/auth');

/**
 * Todas las rutas requieren autenticación
 */
router.use(verificarToken);

/**
 * @route   GET /api/solicitudes
 * @desc    Listar solicitudes (con filtros)
 * @access  Private (Todos los roles)
 */
router.get('/', solicitudesController.listarSolicitudes);

/**
 * @route   GET /api/solicitudes/:id
 * @desc    Obtener detalle de solicitud
 * @access  Private (Todos los roles)
 */
router.get('/:id', solicitudesController.obtenerSolicitud);

/**
 * @route   POST /api/solicitudes
 * @desc    Crear solicitud manual
 * @access  Private (Supervisor, Admin)
 */
router.post('/', verificarRol('supervisor', 'admin'), solicitudesController.crearSolicitud);

/**
 * @route   PUT /api/solicitudes/:id
 * @desc    Actualizar solicitud
 * @access  Private (Supervisor, Admin)
 */
router.put('/:id', verificarRol('supervisor', 'admin'), solicitudesController.actualizarSolicitud);

/**
 * @route   PUT /api/solicitudes/:id/aprobar
 * @desc    Aprobar solicitud
 * @access  Private (Supervisor, Admin)
 */
router.put('/:id/aprobar', verificarRol('supervisor', 'admin'), solicitudesController.aprobarSolicitud);

/**
 * @route   PUT /api/solicitudes/:id/rechazar
 * @desc    Rechazar solicitud
 * @access  Private (Supervisor, Admin)
 */
router.put('/:id/rechazar', verificarRol('supervisor', 'admin'), solicitudesController.rechazarSolicitud);

/**
 * @route   PUT /api/solicitudes/:id/editar
 * @desc    Editar solicitud rechazada (corregir clasificación IA)
 * @access  Private (Supervisor, Admin)
 */
router.put('/:id/editar', verificarRol('supervisor', 'admin'), solicitudesController.editarSolicitudRechazada);

/**
 * @route   DELETE /api/solicitudes/:id
 * @desc    Eliminar solicitud (TESTING)
 * @access  Private (Supervisor, Admin)
 */
router.delete('/:id', verificarRol('supervisor', 'admin'), solicitudesController.eliminarSolicitud);

module.exports = router;
