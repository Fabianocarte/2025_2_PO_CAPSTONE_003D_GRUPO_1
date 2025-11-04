const { Solicitud, Usuario, Vehiculo, OrdenTrabajo, Conversacion } = require('../models');
const { Op } = require('sequelize');
const AgendamientoSimple = require('../services/agendamientoSimple');

/**
 * Listar todas las solicitudes (con filtros)
 */
const listarSolicitudes = async (req, res) => {
    try {
        const { estado, prioridad, fecha_desde, fecha_hasta, vehiculo_id } = req.query;
        
        // Construir filtros
        const where = {};
        if (estado) where.estado = estado;
        if (prioridad) where.prioridad = prioridad;
        if (vehiculo_id) where.vehiculo_id = vehiculo_id;
        
        if (fecha_desde || fecha_hasta) {
            where.fecha_hora = {};
            if (fecha_desde) where.fecha_hora[Op.gte] = new Date(fecha_desde);
            if (fecha_hasta) where.fecha_hora[Op.lte] = new Date(fecha_hasta);
        }

        // Si es chofer, solo ver sus solicitudes
        if (req.usuario.rol === 'chofer') {
            where.chofer_id = req.usuario.id;
        }

        const solicitudes = await Solicitud.findAll({
            where,
            include: [
                {
                    model: Usuario,
                    as: 'chofer',
                    attributes: ['id', 'nombre', 'telefono']
                },
                {
                    model: Vehiculo,
                    as: 'vehiculo',
                    attributes: ['id', 'patente', 'marca', 'modelo']
                },
                {
                    model: OrdenTrabajo,
                    as: 'orden_trabajo',
                    attributes: ['id', 'estado']
                }
            ],
            order: [['fecha_hora', 'DESC']]
        });

        res.json({
            total: solicitudes.length,
            solicitudes
        });

    } catch (error) {
        console.error('Error listando solicitudes:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

/**
 * Obtener detalle de una solicitud
 */
const obtenerSolicitud = async (req, res) => {
    try {
        const { id } = req.params;

        const solicitud = await Solicitud.findByPk(id, {
            include: [
                { model: Usuario, as: 'chofer' },
                { model: Vehiculo, as: 'vehiculo' },
                { model: OrdenTrabajo, as: 'orden_trabajo' }
            ]
        });

        if (!solicitud) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        // Si es chofer, solo puede ver sus propias solicitudes
        if (req.usuario.rol === 'chofer' && solicitud.chofer_id !== req.usuario.id) {
            return res.status(403).json({ error: 'No tienes permiso para ver esta solicitud' });
        }

        res.json(solicitud);

    } catch (error) {
        console.error('Error obteniendo solicitud:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

/**
 * Crear solicitud manualmente (por supervisor/admin)
 */
const crearSolicitud = async (req, res) => {
    try {
        const { chofer_id, vehiculo_id, descripcion, prioridad, tipo } = req.body;

        if (!descripcion) {
            return res.status(400).json({ error: 'La descripción es requerida' });
        }

        const nuevaSolicitud = await Solicitud.create({
            chofer_id,
            vehiculo_id,
            descripcion,
            prioridad: prioridad || 'media',
            tipo: tipo || 'otro',
            estado: 'pendiente'
        });

        res.status(201).json({
            message: 'Solicitud creada exitosamente',
            solicitud: nuevaSolicitud
        });

    } catch (error) {
        console.error('Error creando solicitud:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

/**
 * Actualizar estado de solicitud
 */
const actualizarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, notas_supervisor } = req.body;

        const solicitud = await Solicitud.findByPk(id);

        if (!solicitud) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        // Actualizar
        if (estado) solicitud.estado = estado;
        if (notas_supervisor) solicitud.notas_supervisor = notas_supervisor;

        await solicitud.save();

        res.json({
            message: 'Solicitud actualizada',
            solicitud
        });

    } catch (error) {
        console.error('Error actualizando solicitud:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

/**
 * Aprobar solicitud
 * Cambia el estado a 'aprobada', crea automáticamente una OT y notifica al chofer
 */
const aprobarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const { notas_supervisor } = req.body;

        const solicitud = await Solicitud.findByPk(id, {
            include: [
                { model: Usuario, as: 'chofer' },
                { model: Vehiculo, as: 'vehiculo' }
            ]
        });

        if (!solicitud) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        // Permitir aprobar solicitudes 'pendiente' o 'rechazada' (re-aprobación después de editar)
        if (!['pendiente', 'rechazada'].includes(solicitud.estado)) {
            return res.status(400).json({ 
                error: `No se puede aprobar una solicitud en estado '${solicitud.estado}'` 
            });
        }

        // Actualizar estado de la solicitud
        solicitud.estado = 'aprobada';
        if (notas_supervisor) {
            solicitud.notas_supervisor = notas_supervisor;
        }
        await solicitud.save();

        // ============================================
        // 🆕 CREAR CITA AUTOMÁTICAMENTE
        // ============================================
        let citaCreada = null;
        try {
            citaCreada = await AgendamientoSimple.crearCitaAutomatica(solicitud.id, solicitud);
            if (citaCreada) {
                console.log(`📅 Cita automática creada: ${citaCreada.fecha_cita} ${citaCreada.hora_cita}`);
            }
        } catch (errorCita) {
            console.warn('⚠️ No se pudo crear cita automática:', errorCita.message);
            // No fallar la aprobación por esto
        }

        // ============================================
        // CREAR ORDEN DE TRABAJO AUTOMÁTICAMENTE
        // ============================================
        const nuevaOT = await OrdenTrabajo.create({
            solicitud_id: solicitud.id,
            mecanico_id: citaCreada?.mecanico_id || null, // 🆕 Asignar mecánico de la cita
            supervisor_id: req.usuario.id, // El usuario que aprobó
            estado: 'asignada',
            observaciones: notas_supervisor || 'Orden creada automáticamente al aprobar solicitud'
        });

        console.log(`✅ Orden de Trabajo #${nuevaOT.id} creada automáticamente para solicitud #${solicitud.id}`);

        // Notificar al chofer por WhatsApp
        const { sendWhatsAppMessage } = require('../config/twilio');
        if (solicitud.telefono_origen) {
            const mensajeCita = citaCreada ? 
                `\n📅 *Cita Agendada:*\nFecha: ${new Date(citaCreada.fecha_cita).toLocaleDateString('es-CL')}\nHora: ${citaCreada.hora_cita}\nDuración: ${citaCreada.duracion_estimada} minutos\n` : 
                '\n⏳ Cita por agendar (será contactado pronto)\n';

            const mensaje = `✅ *SOLICITUD APROBADA*\n\n` +
                `Tu solicitud #${solicitud.id} ha sido aprobada.\n\n` +
                `📋 *Detalles:*\n` +
                `Vehículo: ${solicitud.vehiculo?.patente || 'N/A'}\n` +
                `Problema: ${solicitud.tipo}\n` +
                `Prioridad: ${solicitud.prioridad.toUpperCase()}\n\n` +
                (notas_supervisor ? `💬 *Notas del supervisor:*\n${notas_supervisor}\n\n` : '') +
                `🔧 Se creó la Orden de Trabajo #${nuevaOT.id}\n` +
                mensajeCita +
                `Recibirás actualizaciones del progreso.`;

            try {
                await sendWhatsAppMessage(solicitud.telefono_origen, mensaje);
                console.log(`✅ Notificación de aprobación enviada a ${solicitud.telefono_origen}`);
            } catch (error) {
                console.error('Error enviando notificación WhatsApp:', error);
            }
        }

        // Actualizar conversación (permitir nuevas solicitudes)
        if (solicitud.telefono_origen) {
            const conversacion = await Conversacion.findOne({ 
                where: { telefono: solicitud.telefono_origen } 
            });
            
            if (conversacion) {
                await conversacion.update({
                    tiene_solicitud_activa: false,
                    solicitud_activa_id: null
                });
            }
        }

        // Recargar la solicitud con la OT asociada
        await solicitud.reload({
            include: [
                { model: Usuario, as: 'chofer' },
                { model: Vehiculo, as: 'vehiculo' },
                { model: OrdenTrabajo, as: 'orden_trabajo' }
            ]
        });

        res.json({
            message: 'Solicitud aprobada y Orden de Trabajo creada exitosamente',
            solicitud,
            orden_trabajo: nuevaOT,
            cita: citaCreada ? {
                id: citaCreada.id,
                fecha: citaCreada.fecha_cita,
                hora: citaCreada.hora_cita,
                mecanico: citaCreada.mecanico?.nombre
            } : null
        });

    } catch (error) {
        console.error('Error aprobando solicitud:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

/**
 * Rechazar solicitud
 * Marca como 'rechazada' para permitir edición manual y re-aprobación posterior
 * Se usa cuando la IA clasificó mal la solicitud
 */
const rechazarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo_rechazo } = req.body;

        if (!motivo_rechazo || motivo_rechazo.trim() === '') {
            return res.status(400).json({ 
                error: 'Debes proporcionar un motivo de rechazo' 
            });
        }

        const solicitud = await Solicitud.findByPk(id, {
            include: [
                { model: Usuario, as: 'chofer' },
                { model: Vehiculo, as: 'vehiculo' }
            ]
        });

        if (!solicitud) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        if (solicitud.estado !== 'pendiente') {
            return res.status(400).json({ 
                error: `No se puede rechazar una solicitud en estado '${solicitud.estado}'` 
            });
        }

        // Actualizar estado (marcada para edición, NO eliminada)
        solicitud.estado = 'rechazada';
        solicitud.notas_supervisor = `[RECHAZADA - Requiere edición] ${motivo_rechazo}`;
        await solicitud.save();

        console.log(`❌ Solicitud #${id} rechazada - Disponible para edición manual`);

        // NO notificar al chofer por WhatsApp aún (es un rechazo interno para corrección)
        // Solo se notificará cuando se re-apruebe después de editar

        // Actualizar conversación (permitir nuevas solicitudes)
        if (solicitud.telefono_origen) {
            const conversacion = await Conversacion.findOne({ 
                where: { telefono: solicitud.telefono_origen } 
            });
            
            if (conversacion) {
                await conversacion.update({
                    tiene_solicitud_activa: false,
                    solicitud_activa_id: null
                });
            }
        }

        res.json({
            message: 'Solicitud marcada como rechazada. Ahora puedes editarla manualmente y re-aprobarla.',
            solicitud
        });

    } catch (error) {
        console.error('Error rechazando solicitud:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

/**
 * Editar solicitud rechazada
 * Permite corregir tipo, prioridad, descripción, vehículo cuando la IA clasificó mal
 */
const editarSolicitudRechazada = async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo, prioridad, descripcion, vehiculo_id, notas_supervisor } = req.body;

        const solicitud = await Solicitud.findByPk(id, {
            include: [
                { model: Usuario, as: 'chofer' },
                { model: Vehiculo, as: 'vehiculo' }
            ]
        });

        if (!solicitud) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        // Solo se pueden editar solicitudes rechazadas
        if (solicitud.estado !== 'rechazada') {
            return res.status(400).json({ 
                error: 'Solo se pueden editar solicitudes rechazadas' 
            });
        }

        // Actualizar campos
        if (tipo) solicitud.tipo = tipo;
        if (prioridad) solicitud.prioridad = prioridad;
        if (descripcion) solicitud.descripcion = descripcion;
        if (vehiculo_id) solicitud.vehiculo_id = vehiculo_id;
        if (notas_supervisor) {
            solicitud.notas_supervisor = `[EDITADA MANUALMENTE] ${notas_supervisor}`;
        }

        await solicitud.save();

        // Recargar con relaciones
        await solicitud.reload({
            include: [
                { model: Usuario, as: 'chofer' },
                { model: Vehiculo, as: 'vehiculo' }
            ]
        });

        console.log(`✏️ Solicitud #${id} editada manualmente - Lista para re-aprobar`);

        res.json({
            message: 'Solicitud editada correctamente. Ahora puedes aprobarla para crear la OT.',
            solicitud
        });

    } catch (error) {
        console.error('Error editando solicitud:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

/**
 * Eliminar solicitud (SOLO PARA TESTING)
 * Elimina la solicitud y resetea la conversación asociada
 */
const eliminarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar la solicitud
        const solicitud = await Solicitud.findByPk(id);

        if (!solicitud) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        const telefono = solicitud.telefono_origen;

        // 1. Eliminar la solicitud
        await solicitud.destroy();

        // 2. Resetear la conversación (si existe)
        if (telefono) {
            const conversacion = await Conversacion.findOne({ where: { telefono } });
            
            if (conversacion) {
                // Resetear completamente para permitir nuevas solicitudes
                await conversacion.update({
                    estado: 'activa', // Cambiar a 'activa' para poder recibir nuevas solicitudes
                    tiene_solicitud_activa: false,
                    solicitud_activa_id: null, // Limpiar el ID de la solicitud activa
                    ultimo_mensaje: new Date(), // Actualizar timestamp
                    mensajes_sin_incidencia: 0 // Resetear contador
                });

                console.log(`🗑️ Conversación ${conversacion.id} reseteada para ${telefono}`);
            }
        }

        res.json({
            message: 'Solicitud eliminada y conversación reseteada correctamente',
            solicitud_eliminada: id
        });

    } catch (error) {
        console.error('Error eliminando solicitud:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

module.exports = {
    listarSolicitudes,
    obtenerSolicitud,
    crearSolicitud,
    actualizarSolicitud,
    aprobarSolicitud,
    rechazarSolicitud,
    editarSolicitudRechazada,
    eliminarSolicitud
};
