const express = require('express');
const router = express.Router();
const citasController = require('../controllers/citas.controller');
const { verificarToken, verificarRol } = require('../middleware/auth');

// Vista semanal tipo calendario (Admin, Supervisor, Mecánico)
router.get('/vista-semanal', 
    verificarToken, 
    verificarRol('admin', 'supervisor', 'mecanico'), 
    citasController.obtenerVistaSemanal
);

// Vista de mis citas (solo mecánicos)
router.get('/mis-citas', 
    verificarToken, 
    verificarRol('mecanico'), 
    citasController.obtenerMisCitas
);

// Vista de equipo (Admin y Supervisor)
router.get('/vista-equipo', 
    verificarToken, 
    verificarRol('admin', 'supervisor'), 
    citasController.obtenerVistaEquipo
);

// Cambiar estado de cita (Admin, Supervisor, Mecánico propio)
router.put('/:id/estado', 
    verificarToken, 
    verificarRol('admin', 'supervisor', 'mecanico'), 
    citasController.cambiarEstadoCita
);

// Crear cita manual (Admin y Supervisor)
router.post('/manual', 
    verificarToken, 
    verificarRol('admin', 'supervisor'), 
    citasController.crearCitaManual
);

module.exports = router;