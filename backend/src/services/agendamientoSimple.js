const { CitaTaller, Usuario, Solicitud, Vehiculo } = require('../models');
const { Op } = require('sequelize');

class AgendamientoSimple {
    
    /**
     * Crear cita automática al aprobar solicitud
     */
    static async crearCitaAutomatica(solicitudId, solicitud) {
        try {
            // 1. Buscar mecánico menos ocupado
            const mecanicoOptimo = await this.buscarMecanicoOptimo(solicitud.prioridad);
            
            if (!mecanicoOptimo) {
                throw new Error('No hay mecánicos disponibles');
            }
            
            // 2. Buscar próximo slot disponible
            const proximoSlot = await this.buscarProximoSlot(mecanicoOptimo.id, solicitud.prioridad);
            
            // 3. Crear la cita
            const nuevaCita = await CitaTaller.create({
                solicitud_id: solicitudId,
                mecanico_id: mecanicoOptimo.id,
                fecha_cita: proximoSlot.fecha,
                hora_cita: proximoSlot.hora,
                duracion_estimada: 30, // 30 minutos por defecto
                tipo_agendamiento: 'automatico',
                estado_cita: 'programada'
            });
            
            console.log(`📅 Cita creada automáticamente: ${proximoSlot.fecha} ${proximoSlot.hora} - Mecánico: ${mecanicoOptimo.nombre}`);
            
            return nuevaCita;
            
        } catch (error) {
            console.error('Error creando cita automática:', error);
            return null;
        }
    }
    
    /**
     * Buscar mecánico con menos carga de trabajo
     */
    static async buscarMecanicoOptimo(prioridad) {
        const fechaHoy = new Date();
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + 7); // Próximos 7 días
        
        const mecanicos = await Usuario.findAll({
            where: { 
                rol: 'mecanico', 
                activo: true 
            },
            include: [{
                model: CitaTaller,
                as: 'citas_taller',
                where: {
                    fecha_cita: {
                        [Op.between]: [fechaHoy.toISOString().split('T')[0], fechaLimite.toISOString().split('T')[0]]
                    },
                    estado_cita: ['programada', 'confirmada', 'en_proceso']
                },
                required: false
            }]
        });
        
        if (mecanicos.length === 0) {
            return null;
        }
        
        // Retornar el mecánico con menos citas
        return mecanicos.sort((a, b) => (a.citas_taller?.length || 0) - (b.citas_taller?.length || 0))[0];
    }
    
    /**
     * Buscar próximo slot disponible con slots de 30 minutos
     */
    static async buscarProximoSlot(mecanicoId, prioridad) {
        const diasBusqueda = prioridad === 'urgente' ? 1 : prioridad === 'alta' ? 3 : 7;
        
        // Slots de 30 minutos de 8:00 a 18:00 (excluyendo almuerzo 12:00-14:00)
        const horasTaller = [
            '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
        ];
        
        for (let dia = 0; dia < diasBusqueda; dia++) {
            const fecha = new Date();
            fecha.setDate(fecha.getDate() + dia);
            
            // Saltar fines de semana
            if (fecha.getDay() === 0 || fecha.getDay() === 6) continue;
            
            for (const hora of horasTaller) {
                const citaExistente = await CitaTaller.findOne({
                    where: {
                        mecanico_id: mecanicoId,
                        fecha_cita: fecha.toISOString().split('T')[0],
                        hora_cita: hora,
                        estado_cita: ['programada', 'confirmada', 'en_proceso']
                    }
                });
                
                if (!citaExistente) {
                    return { fecha: fecha.toISOString().split('T')[0], hora };
                }
            }
        }
        
        throw new Error('No hay slots disponibles');
    }
    
    /**
     * Obtener agenda de un mecánico
     */
    static async obtenerAgendaMecanico(mecanicoId, fecha = null) {
        const fechaBusqueda = fecha || new Date().toISOString().split('T')[0];
        
        return await CitaTaller.findAll({
            where: {
                mecanico_id: mecanicoId,
                fecha_cita: fechaBusqueda
            },
            include: [{
                model: Solicitud,
                as: 'solicitud',
                include: [
                    { model: Vehiculo, as: 'vehiculo' },
                    { model: Usuario, as: 'chofer' }
                ]
            }],
            order: [['hora_cita', 'ASC']]
        });
    }
    
    /**
     * Vista semanal para calendario
     */
    static async obtenerVistaSemanal(fechaInicio, usuarioRol, mecanicoId = null) {
        const fechaFin = new Date(fechaInicio);
        fechaFin.setDate(fechaFin.getDate() + 6); // 7 días
        
        let whereClause = {
            fecha_cita: {
                [Op.between]: [fechaInicio, fechaFin.toISOString().split('T')[0]]
            }
        };
        
        // Si es mecánico, solo sus citas
        if (usuarioRol === 'mecanico' && mecanicoId) {
            whereClause.mecanico_id = mecanicoId;
        }
        
        const citas = await CitaTaller.findAll({
            where: whereClause,
            include: [
                {
                    model: Solicitud,
                    as: 'solicitud',
                    include: [
                        { model: Vehiculo, as: 'vehiculo' },
                        { model: Usuario, as: 'chofer' }
                    ]
                },
                {
                    model: Usuario,
                    as: 'mecanico',
                    attributes: ['id', 'nombre']
                }
            ],
            order: [['fecha_cita', 'ASC'], ['hora_cita', 'ASC']]
        });
        
        // Organizar por día de la semana
        const calendarioSemanal = this.organizarCalendarioSemanal(citas, fechaInicio);
        
        return calendarioSemanal;
    }
    
    /**
     * Vista de equipo para supervisores y admin
     */
    static async obtenerVistaEquipo(fecha) {
        const mecanicos = await Usuario.findAll({
            where: { rol: 'mecanico', activo: true },
            include: [{
                model: CitaTaller,
                as: 'citas_taller',
                where: { fecha_cita: fecha },
                include: [{
                    model: Solicitud,
                    as: 'solicitud',
                    include: [{ model: Vehiculo, as: 'vehiculo' }]
                }],
                required: false
            }]
        });
        
        return mecanicos.map(mecanico => ({
            mecanico: {
                id: mecanico.id,
                nombre: mecanico.nombre
            },
            citas: mecanico.citas_taller || [],
            disponibilidad: this.calcularDisponibilidad(mecanico.citas_taller),
            horasOcupadas: this.calcularHorasOcupadas(mecanico.citas_taller)
        }));
    }
    
    /**
     * Organizar citas en formato calendario semanal
     */
    static organizarCalendarioSemanal(citas, fechaInicio) {
        const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const calendario = {};
        
        // Inicializar días de la semana
        for (let i = 0; i < 7; i++) {
            const fecha = new Date(fechaInicio);
            fecha.setDate(fecha.getDate() + i);
            const fechaStr = fecha.toISOString().split('T')[0];
            
            calendario[fechaStr] = {
                dia: diasSemana[i],
                fecha: fechaStr,
                fechaFormateada: fecha.toLocaleDateString('es-CL'),
                citas: []
            };
        }
        
        // Asignar citas a cada día
        citas.forEach(cita => {
            if (calendario[cita.fecha_cita]) {
                calendario[cita.fecha_cita].citas.push(cita);
            }
        });
        
        return calendario;
    }
    
    /**
     * Calcular disponibilidad del mecánico
     */
    static calcularDisponibilidad(citas) {
        if (!citas || citas.length === 0) return 'disponible';
        
        const citasActivas = citas.filter(cita => 
            ['programada', 'confirmada', 'en_proceso'].includes(cita.estado_cita)
        );
        
        if (citasActivas.length >= 16) return 'ocupado'; // 8 horas = 16 slots de 30min
        if (citasActivas.length >= 8) return 'parcial';
        return 'disponible';
    }
    
    /**
     * Calcular horas ocupadas
     */
    static calcularHorasOcupadas(citas) {
        if (!citas || citas.length === 0) return 0;
        
        const citasActivas = citas.filter(cita => 
            ['programada', 'confirmada', 'en_proceso'].includes(cita.estado_cita)
        );
        
        return Math.round((citasActivas.length * 0.5) * 10) / 10; // 0.5 horas por slot
    }
    
    /**
     * Helper para obtener el lunes de la semana actual
     */
    static obtenerLunesActual() {
        const hoy = new Date();
        const dia = hoy.getDay();
        const diasHastaLunes = dia === 0 ? -6 : 1 - dia; // Si es domingo (0), retroceder 6 días
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() + diasHastaLunes);
        return lunes.toISOString().split('T')[0];
    }
}

module.exports = AgendamientoSimple;