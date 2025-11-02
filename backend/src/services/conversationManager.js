const NodeCache = require('node-cache');

/**
 * Gestor de Conversaciones
 * Mantiene contexto, previene duplicados, gestiona estados
 */
class ConversationManager {
    constructor() {
        // Cache en memoria para acceso rápido (TTL: 1 hora)
        this.cache = new NodeCache({ 
            stdTTL: 3600, 
            checkperiod: 600,
            useClones: false 
        });
    }

    /**
     * Obtener o crear conversación
     * @param {string} telefono 
     * @param {object} models - { Conversacion, Solicitud }
     * @returns {Promise<object>} Conversación con contexto
     */
    async obtenerConversacion(telefono, models) {
        const { Conversacion, Solicitud } = models;

        // 1. Buscar en cache
        let conversacion = this.cache.get(telefono);
        if (conversacion) {
            console.log(`📦 Conversación encontrada en cache: ${telefono}`);
            return conversacion;
        }

        // 2. Buscar en base de datos
        conversacion = await Conversacion.findOne({
            where: { telefono },
            include: [{
                model: Solicitud,
                as: 'solicitudActiva',
                required: false
            }]
        });

        // 3. Si no existe, crear nueva
        if (!conversacion) {
            console.log(`🆕 Creando nueva conversación: ${telefono}`);
            conversacion = await Conversacion.create({
                telefono,
                estado: 'activa',
                ultimo_mensaje: new Date(),
                mensajes_sin_incidencia: 0,
                tiene_solicitud_activa: false
            });
        }

        // 4. Verificar si tiene solicitud activa vigente
        if (conversacion.solicitud_activa_id) {
            const solicitud = await Solicitud.findByPk(conversacion.solicitud_activa_id);
            
            // Si la solicitud ya no está activa, actualizar conversación
            if (!solicitud || !['pendiente', 'en_proceso', 'esperando_repuesto'].includes(solicitud.estado)) {
                await conversacion.update({
                    tiene_solicitud_activa: false,
                    solicitud_activa_id: null,
                    estado: 'activa'
                });
                conversacion.solicitudActiva = null;
            } else {
                conversacion.solicitudActiva = solicitud;
            }
        }

        // 5. Guardar en cache
        this.cache.set(telefono, conversacion);

        return conversacion;
    }

    /**
     * Verificar si debe saludar o no
     * @param {object} conversacion 
     * @returns {boolean} true si debe saludar
     */
    debeSaludar(conversacion) {
        if (!conversacion.ultimo_saludo) {
            return true; // Primer contacto
        }

        // Si pasaron más de 4 horas desde el último saludo
        const horasDesdeUltimoSaludo = (Date.now() - new Date(conversacion.ultimo_saludo)) / (1000 * 60 * 60);
        return horasDesdeUltimoSaludo > 4;
    }

    /**
     * Registrar que se realizó un saludo
     * @param {object} conversacion 
     */
    async registrarSaludo(conversacion) {
        await conversacion.update({ ultimo_saludo: new Date() });
        this.cache.set(conversacion.telefono, conversacion);
    }

    /**
     * Verificar si el chofer puede crear nueva solicitud
     * @param {object} conversacion 
     * @returns {object} { puede: boolean, razon: string, solicitudActiva: object|null }
     */
    puedeCrearSolicitud(conversacion) {
        if (!conversacion.tiene_solicitud_activa) {
            return { 
                puede: true, 
                razon: 'No tiene solicitudes activas',
                solicitudActiva: null
            };
        }

        return {
            puede: false,
            razon: `Ya tiene la solicitud #${conversacion.solicitud_activa_id} en proceso`,
            solicitudActiva: conversacion.solicitudActiva
        };
    }

    /**
     * Registrar nueva solicitud creada
     * @param {object} conversacion 
     * @param {number} solicitudId 
     */
    async registrarNuevaSolicitud(conversacion, solicitudId) {
        await conversacion.update({
            tiene_solicitud_activa: true,
            solicitud_activa_id: solicitudId,
            mensajes_sin_incidencia: 0,
            ultimo_mensaje: new Date()
        });
        this.cache.set(conversacion.telefono, conversacion);
    }

    /**
     * Agregar mensaje al historial
     * @param {object} conversacion 
     * @param {object} models - { HistorialMensaje }
     * @param {object} datos - { tipo, mensaje, tieneImagenes, numeroImagenes, fueIncidencia }
     */
    async agregarMensaje(conversacion, models, datos) {
        const { HistorialMensaje } = models;

        await HistorialMensaje.create({
            conversacion_id: conversacion.id,
            telefono: conversacion.telefono,
            tipo: datos.tipo, // 'entrante' o 'saliente'
            mensaje: datos.mensaje,
            tiene_imagenes: datos.tieneImagenes || false,
            numero_imagenes: datos.numeroImagenes || 0,
            fue_incidencia: datos.fueIncidencia || false,
            metadata: datos.metadata || null
        });

        // Actualizar contador si no fue incidencia
        if (datos.tipo === 'entrante' && !datos.fueIncidencia) {
            await conversacion.update({
                mensajes_sin_incidencia: conversacion.mensajes_sin_incidencia + 1,
                ultimo_mensaje: new Date()
            });
        } else {
            await conversacion.update({
                ultimo_mensaje: new Date()
            });
        }

        this.cache.set(conversacion.telefono, conversacion);
    }

    /**
     * Obtener resumen de conversación para la IA
     * @param {object} conversacion 
     * @param {object} models - { HistorialMensaje }
     * @returns {Promise<string>} Resumen del contexto
     */
    async obtenerContextoIA(conversacion, models) {
        const { HistorialMensaje } = models;

        // Obtener últimos 10 mensajes
        const mensajes = await HistorialMensaje.findAll({
            where: { conversacion_id: conversacion.id },
            order: [['created_at', 'DESC']],
            limit: 10
        });

        if (mensajes.length === 0) {
            return 'Primera conversación con este usuario.';
        }

        let contexto = `Conversación anterior (${mensajes.length} mensajes recientes):\n`;
        
        mensajes.reverse().forEach((msg, idx) => {
            const emisor = msg.tipo === 'entrante' ? 'Chofer' : 'Bot';
            const texto = msg.mensaje ? msg.mensaje.substring(0, 100) : '[mensaje vacío]';
            const imagenes = msg.tiene_imagenes ? ` [${msg.numero_imagenes} foto(s)]` : '';
            contexto += `${idx + 1}. ${emisor}: ${texto}${imagenes}\n`;
        });

        if (conversacion.tiene_solicitud_activa) {
            contexto += `\n⚠️ IMPORTANTE: Tiene solicitud activa #${conversacion.solicitud_activa_id} en proceso.`;
        }

        if (conversacion.ultimo_saludo) {
            const horasDesdeUltimoSaludo = (Date.now() - new Date(conversacion.ultimo_saludo)) / (1000 * 60 * 60);
            if (horasDesdeUltimoSaludo < 4) {
                contexto += `\nYa saludó hace ${Math.round(horasDesdeUltimoSaludo * 60)} minutos.`;
            }
        }

        return contexto;
    }

    /**
     * Sugerir acción basada en el patrón de mensajes
     * @param {object} conversacion 
     * @returns {string|null} Sugerencia de respuesta automática
     */
    obtenerSugerenciaAutomatica(conversacion) {
        // Si envió 3+ mensajes sin reportar incidencia
        if (conversacion.mensajes_sin_incidencia >= 3 && !conversacion.tiene_solicitud_activa) {
            return '👋 Noto que has enviado varios mensajes. ¿Necesitas reportar algún problema con tu vehículo? Si es así, descríbelo y adjunta fotos si es posible.';
        }

        return null;
    }

    /**
     * Cerrar conversación
     * @param {object} conversacion 
     */
    async cerrarConversacion(conversacion) {
        await conversacion.update({ estado: 'cerrada' });
        this.cache.del(conversacion.telefono);
    }

    /**
     * Actualizar estado de conversaciones antiguas
     * NO SE BORRAN - Solo se marcan como 'cerrada' para mantener historial
     * @param {object} models - { Conversacion, Solicitud }
     * @param {number} horasInactividad - Por defecto 24 horas
     */
    async actualizarEstadoConversaciones(models, horasInactividad = 24) {
        const { Conversacion, Solicitud } = models;
        const fechaLimite = new Date(Date.now() - horasInactividad * 60 * 60 * 1000);

        // Cerrar conversaciones inactivas SIN solicitud activa
        const cerradas = await Conversacion.update(
            { estado: 'cerrada' },
            {
                where: {
                    ultimo_mensaje: { [require('sequelize').Op.lt]: fechaLimite },
                    estado: 'activa',
                    tiene_solicitud_activa: false
                }
            }
        );

        // Limpiar flag de solicitud activa si la solicitud ya no está activa
        const conversacionesConOT = await Conversacion.findAll({
            where: { 
                tiene_solicitud_activa: true,
                solicitud_activa_id: { [require('sequelize').Op.ne]: null }
            }
        });

        let otLimpiadas = 0;
        for (const conv of conversacionesConOT) {
            const solicitud = await Solicitud.findByPk(conv.solicitud_activa_id);
            
            // Si la OT está finalizada, limpiar el flag
            if (!solicitud || ['completada', 'cancelada', 'rechazada'].includes(solicitud.estado)) {
                await conv.update({
                    tiene_solicitud_activa: false,
                    solicitud_activa_id: null,
                    estado: 'activa' // Reactivar para poder crear nuevas OT
                });
                otLimpiadas++;
            }
        }

        console.log(`🧹 Mantenimiento de conversaciones:`);
        console.log(`   - ${cerradas[0]} conversaciones marcadas como cerradas (inactivas)`);
        console.log(`   - ${otLimpiadas} flags de OT activa limpiados (OT finalizadas)`);
        console.log(`   📊 Todas las conversaciones se mantienen en BD para historial`);
        
        return { cerradas: cerradas[0], otLimpiadas };
    }

    /**
     * Obtener estadísticas de conversaciones
     * @param {object} models - { Conversacion, HistorialMensaje }
     * @returns {Promise<object>} Estadísticas
     */
    async obtenerEstadisticas(models) {
        const { Conversacion, HistorialMensaje } = models;
        const { Op } = require('sequelize');

        const total = await Conversacion.count();
        const activas = await Conversacion.count({ where: { estado: 'activa' } });
        const conOTActiva = await Conversacion.count({ where: { tiene_solicitud_activa: true } });
        const cerradas = await Conversacion.count({ where: { estado: 'cerrada' } });
        const totalMensajes = await HistorialMensaje.count();

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const mensajesHoy = await HistorialMensaje.count({
            where: { created_at: { [Op.gte]: hoy } }
        });

        return {
            total,
            activas,
            conOTActiva,
            cerradas,
            totalMensajes,
            mensajesHoy
        };
    }

    /**
     * Limpiar cache
     */
    limpiarCache() {
        this.cache.flushAll();
        console.log('🗑️ Cache de conversaciones limpiado');
    }
}

// Singleton
module.exports = new ConversationManager();
