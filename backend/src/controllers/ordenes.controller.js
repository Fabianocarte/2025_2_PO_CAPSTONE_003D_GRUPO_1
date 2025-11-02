const { OrdenTrabajo, Solicitud, Usuario, Vehiculo, Conversacion, HistorialMensaje } = require('../models');

/**
 * Listar órdenes de trabajo
 */
const listarOrdenes = async (req, res) => {
    try {
        const { estado, mecanico_id, ver_todas } = req.query;
        
        const where = {};
        if (estado) where.estado = estado;
        
        // Si se especifica mecanico_id en el query, usarlo
        if (mecanico_id) {
            where.mecanico_id = mecanico_id;
        } 
        // Si es mecánico y NO se pide ver_todas, filtrar por sus órdenes
        else if (req.usuario.rol === 'mecanico' && ver_todas !== 'true') {
            where.mecanico_id = req.usuario.id;
        }

        const ordenes = await OrdenTrabajo.findAll({
            where,
            include: [
                {
                    model: Solicitud,
                    as: 'solicitud',
                    include: [
                        { model: Usuario, as: 'chofer', attributes: ['nombre', 'telefono'] },
                        { model: Vehiculo, as: 'vehiculo' }
                    ]
                },
                { model: Usuario, as: 'mecanico', attributes: ['id', 'nombre'] },
                { model: Usuario, as: 'supervisor', attributes: ['id', 'nombre'] }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({
            total: ordenes.length,
            ordenes
        });

    } catch (error) {
        console.error('Error listando órdenes:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

/**
 * Crear orden de trabajo desde solicitud
 */
const crearOrden = async (req, res) => {
    try {
        const { solicitud_id, mecanico_id, diagnostico } = req.body;

        if (!solicitud_id) {
            return res.status(400).json({ error: 'solicitud_id es requerido' });
        }

        // Verificar que la solicitud existe
        const solicitud = await Solicitud.findByPk(solicitud_id);
        if (!solicitud) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        // Verificar que no tenga OT ya creada
        const otExistente = await OrdenTrabajo.findOne({ where: { solicitud_id } });
        if (otExistente) {
            return res.status(400).json({ error: 'Esta solicitud ya tiene una orden de trabajo' });
        }

        // Crear OT
        const nuevaOrden = await OrdenTrabajo.create({
            solicitud_id,
            mecanico_id,
            supervisor_id: req.usuario.id,
            diagnostico,
            estado: 'asignada'
        });

        // Actualizar estado de solicitud
        solicitud.estado = 'en_proceso';
        await solicitud.save();

        res.status(201).json({
            message: 'Orden de trabajo creada',
            orden: nuevaOrden
        });

    } catch (error) {
        console.error('Error creando orden:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

/**
 * Actualizar orden de trabajo
 */
const actualizarOrden = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            estado, 
            diagnostico, 
            trabajo_realizado, 
            repuestos_usados, 
            costo_total,
            horas_trabajo,
            fecha_inicio,
            fecha_fin
        } = req.body;

        const orden = await OrdenTrabajo.findByPk(id);

        if (!orden) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        // Actualizar campos
        if (estado) orden.estado = estado;
        if (diagnostico) orden.diagnostico = diagnostico;
        if (trabajo_realizado) orden.trabajo_realizado = trabajo_realizado;
        if (repuestos_usados) orden.repuestos_usados = repuestos_usados;
        if (costo_total) orden.costo_total = costo_total;
        if (horas_trabajo) orden.horas_trabajo = horas_trabajo;
        if (fecha_inicio) orden.fecha_inicio = fecha_inicio;
        if (fecha_fin) orden.fecha_fin = fecha_fin;

        await orden.save();

        res.json({
            message: 'Orden actualizada',
            orden
        });

    } catch (error) {
        console.error('Error actualizando orden:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

/**
 * Eliminar orden de trabajo (SOLO PARA TESTING)
 * Elimina la OT, la solicitud y resetea la conversación asociada
 */
const eliminarOrden = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar la orden con su solicitud
        const orden = await OrdenTrabajo.findByPk(id, {
            include: [
                {
                    model: Solicitud,
                    as: 'solicitud'
                }
            ]
        });

        if (!orden) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        const solicitud = orden.solicitud;
        const telefono = solicitud?.telefono_origen;

        // 1. Eliminar la orden de trabajo
        await orden.destroy();

        // 2. Eliminar la solicitud asociada
        if (solicitud) {
            await solicitud.destroy();
        }

        // 3. Resetear la conversación (si existe)
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
                
                // Opción: Si quieres eliminar también el historial de mensajes (descomenta si lo necesitas)
                // await HistorialMensaje.destroy({ where: { conversacion_id: conversacion.id } });
            }
        }

        res.json({
            message: 'Orden de trabajo, solicitud y conversación reseteadas correctamente',
            orden_eliminada: id
        });

    } catch (error) {
        console.error('Error eliminando orden:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

module.exports = {
    listarOrdenes,
    crearOrden,
    actualizarOrden,
    eliminarOrden
};
