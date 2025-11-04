const AgendamientoSimple = require('../services/agendamientoSimple');
const { CitaTaller, Usuario, Solicitud } = require('../models');

/**
 * Obtener agenda del mecánico logueado
 */
const obtenerMisCitas = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
        
        const citas = await AgendamientoSimple.obtenerAgendaMecanico(usuarioId, fecha);
        
        res.json(citas);
    } catch (error) {
        console.error('Error obteniendo mis citas:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

/**
 * Vista semanal tipo calendario (Admin, Supervisor, Mecánico)
 */
const obtenerVistaSemanal = async (req, res) => {
    try {
        const { fecha_inicio } = req.query;
        const fechaInicio = fecha_inicio || AgendamientoSimple.obtenerLunesActual();
        
        let mecanicoId = null;
        
        // Si es mecánico, solo mostrar sus citas
        if (req.usuario.rol === 'mecanico') {
            mecanicoId = req.usuario.id;
        }
        
        const calendarioSemanal = await AgendamientoSimple.obtenerVistaSemanal(
            fechaInicio, 
            req.usuario.rol, 
            mecanicoId
        );
        
        res.json({
            semana: fechaInicio,
            calendario: calendarioSemanal,
            usuario: {
                rol: req.usuario.rol,
                nombre: req.usuario.nombre
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo vista semanal:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

/**
 * Vista de equipo para supervisores y admin
 */
const obtenerVistaEquipo = async (req, res) => {
    try {
        const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
        
        const vistaEquipo = await AgendamientoSimple.obtenerVistaEquipo(fecha);
        
        res.json({
            fecha,
            equipo: vistaEquipo
        });
        
    } catch (error) {
        console.error('Error obteniendo vista de equipo:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

/**
 * Cambiar estado de cita
 */
const cambiarEstadoCita = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        
        // Verificar que el usuario puede modificar esta cita
        const cita = await CitaTaller.findByPk(id);
        
        if (!cita) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }
        
        // Solo el mecánico asignado, supervisor o admin pueden modificar
        if (req.usuario.rol === 'mecanico' && cita.mecanico_id !== req.usuario.id) {
            return res.status(403).json({ error: 'No tienes permisos para modificar esta cita' });
        }
        
        await cita.update({ estado_cita: estado });
        
        res.json({
            message: 'Estado de cita actualizado',
            cita: cita
        });
        
    } catch (error) {
        console.error('Error cambiando estado de cita:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

/**
 * Crear cita manual (solo admin/supervisor)
 */
const crearCitaManual = async (req, res) => {
    try {
        const { solicitud_id, mecanico_id, fecha_cita, hora_cita, notas_agendamiento } = req.body;
        
        // Verificar que no exista conflicto
        const citaExistente = await CitaTaller.findOne({
            where: {
                mecanico_id,
                fecha_cita,
                hora_cita,
                estado_cita: ['programada', 'confirmada', 'en_proceso']
            }
        });
        
        if (citaExistente) {
            return res.status(400).json({ error: 'Ya existe una cita en ese horario' });
        }
        
        const nuevaCita = await CitaTaller.create({
            solicitud_id,
            mecanico_id,
            fecha_cita,
            hora_cita,
            duracion_estimada: 30,
            tipo_agendamiento: 'manual',
            estado_cita: 'programada',
            notas_agendamiento
        });
        
        res.json({
            message: 'Cita manual creada exitosamente',
            cita: nuevaCita
        });
        
    } catch (error) {
        console.error('Error creando cita manual:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

module.exports = {
    obtenerMisCitas,
    obtenerVistaSemanal,
    obtenerVistaEquipo,
    cambiarEstadoCita,
    crearCitaManual
};