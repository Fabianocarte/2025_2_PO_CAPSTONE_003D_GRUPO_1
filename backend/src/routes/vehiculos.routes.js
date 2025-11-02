const express = require('express');
const router = express.Router();
const vehiculosController = require('../controllers/vehiculos.controller');
const { verificarToken } = require('../middleware/auth');

router.use(verificarToken);

router.get('/', vehiculosController.listarVehiculos);
router.get('/:patente/historial', vehiculosController.obtenerHistorial);

module.exports = router;
