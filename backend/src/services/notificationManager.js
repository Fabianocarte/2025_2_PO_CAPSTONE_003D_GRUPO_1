const EventEmitter = require('events');

/**
 * Gestor de Notificaciones en Tiempo Real
 * Usa EventEmitter para notificar a los clientes conectados via SSE
 */
class NotificationManager extends EventEmitter {
    constructor() {
        super();
        this.clients = new Map(); // Map de userId -> response objects
    }

    /**
     * Registrar cliente para recibir notificaciones
     * @param {number} userId - ID del usuario
     * @param {object} res - Response object de Express
     */
    addClient(userId, res) {
        console.log(`📢 Cliente conectado para notificaciones: Usuario ${userId}`);
        
        if (!this.clients.has(userId)) {
            this.clients.set(userId, []);
        }
        
        this.clients.get(userId).push(res);

        // Limpiar cuando el cliente se desconecta
        res.on('close', () => {
            this.removeClient(userId, res);
        });
    }

    /**
     * Eliminar cliente
     * @param {number} userId 
     * @param {object} res 
     */
    removeClient(userId, res) {
        const userClients = this.clients.get(userId);
        if (userClients) {
            const index = userClients.indexOf(res);
            if (index !== -1) {
                userClients.splice(index, 1);
            }
            
            if (userClients.length === 0) {
                this.clients.delete(userId);
            }
            
            console.log(`📢 Cliente desconectado: Usuario ${userId}`);
        }
    }

    /**
     * Enviar notificación a usuario específico
     * @param {number} userId 
     * @param {object} notification - { tipo, titulo, mensaje, data }
     */
    notifyUser(userId, notification) {
        const userClients = this.clients.get(userId);
        
        if (userClients && userClients.length > 0) {
            const data = JSON.stringify({
                ...notification,
                timestamp: new Date().toISOString()
            });

            userClients.forEach(res => {
                try {
                    res.write(`data: ${data}\n\n`);
                } catch (error) {
                    console.error(`Error enviando notificación a usuario ${userId}:`, error);
                }
            });

            console.log(`📢 Notificación enviada a usuario ${userId} (${userClients.length} cliente(s)):`, notification.tipo);
        } else {
            console.warn(`⚠️ Usuario ${userId} no tiene clientes SSE conectados. Notificación NO enviada.`);
        }
    }

    /**
     * Enviar notificación a múltiples usuarios (por rol)
     * @param {array} userIds - Array de IDs de usuarios
     * @param {object} notification 
     */
    notifyUsers(userIds, notification) {
        userIds.forEach(userId => {
            this.notifyUser(userId, notification);
        });
    }

    /**
     * Notificar a todos los supervisores y admins
     * @param {object} notification 
     * @param {object} Usuario - Modelo de Usuario
     */
    async notifyAllSupervisors(notification, Usuario) {
        try {
            // Buscar supervisores Y administradores
            const usuarios = await Usuario.findAll({
                where: { 
                    rol: ['supervisor', 'admin'], 
                    activo: true 
                },
                attributes: ['id', 'nombre', 'rol']
            });

            const userIds = usuarios.map(u => u.id);
            
            console.log(`📢 Intentando notificar a ${usuarios.length} usuario(s):`);
            usuarios.forEach(u => {
                console.log(`   - ${u.nombre} (${u.rol}) [ID: ${u.id}]`);
            });
            console.log(`📊 Clientes SSE conectados actualmente:`, this.getStats());
            
            this.notifyUsers(userIds, notification);
        } catch (error) {
            console.error('Error notificando supervisores y admins:', error);
        }
    }

    /**
     * Notificar nueva solicitud
     * @param {object} solicitud - Solicitud creada
     * @param {object} Usuario - Modelo de Usuario
     */
    async notifyNewSolicitud(solicitud, Usuario) {
        const notification = {
            tipo: 'nueva_solicitud',
            titulo: `Nueva Solicitud #${solicitud.id}`,
            mensaje: `${solicitud.tipo || 'Mantenimiento'} - Prioridad: ${solicitud.prioridad}`,
            data: {
                solicitudId: solicitud.id,
                prioridad: solicitud.prioridad,
                tipo: solicitud.tipo,
                telefono: solicitud.telefono_origen,
                imagenes: solicitud.imagenes ? solicitud.imagenes.length : 0
            }
        };

        // Notificar a todos los supervisores
        await this.notifyAllSupervisors(notification, Usuario);
    }

    /**
     * Notificar solicitud urgente
     * @param {object} solicitud 
     * @param {object} Usuario 
     */
    async notifyUrgentSolicitud(solicitud, Usuario) {
        const notification = {
            tipo: 'solicitud_urgente',
            titulo: `🚨 SOLICITUD URGENTE #${solicitud.id}`,
            mensaje: `${solicitud.descripcion.substring(0, 100)}...`,
            data: {
                solicitudId: solicitud.id,
                prioridad: solicitud.prioridad,
                tipo: solicitud.tipo,
                telefono: solicitud.telefono_origen,
                imagenes: solicitud.imagenes ? solicitud.imagenes.length : 0
            },
            urgent: true
        };

        // Notificar a supervisores y admins
        await this.notifyAllSupervisors(notification, Usuario);
    }

    /**
     * Obtener estadísticas de conexiones
     */
    getStats() {
        const totalClients = Array.from(this.clients.values())
            .reduce((sum, clients) => sum + clients.length, 0);
        
        return {
            usuariosConectados: this.clients.size,
            conexionesActivas: totalClients
        };
    }
}

// Singleton
module.exports = new NotificationManager();
