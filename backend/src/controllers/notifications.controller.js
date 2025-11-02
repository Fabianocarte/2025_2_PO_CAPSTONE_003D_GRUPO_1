const NotificationManager = require('../services/notificationManager');

/**
 * Endpoint SSE para recibir notificaciones en tiempo real
 */
const streamNotifications = (req, res) => {
    // Configurar headers para SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no'); // Desactivar buffering de proxies como nginx
    if (res.flushHeaders) {
        res.flushHeaders();
    }

    // Enviar comentario inicial para mantener la conexión
    res.write(': connected\n\n');

    // ID del usuario autenticado (viene del middleware auth o query param)
    const userId = req.usuario ? req.usuario.id : null;
    const userInfo = req.usuario ? `${req.usuario.nombre} (${req.usuario.rol})` : 'Desconocido';
    
    console.log(`🔌 Intento de conexión SSE - Usuario: ${userInfo}, ID: ${userId}`);
    
    if (!userId) {
        console.error('❌ Conexión SSE rechazada: No autenticado');
        res.write(`data: ${JSON.stringify({ error: 'No autenticado' })}\n\n`);
        res.end();
        return;
    }

    // Registrar cliente en el NotificationManager
    NotificationManager.addClient(userId, res);
    console.log(`✅ Cliente SSE registrado - Usuario ${userId} (${userInfo})`);

    // Enviar notificación de bienvenida
    res.write(`data: ${JSON.stringify({
        tipo: 'connected',
        mensaje: 'Conectado al sistema de notificaciones',
        timestamp: new Date().toISOString()
    })}\n\n`);

    // Keep-alive cada 30 segundos
    const keepAliveInterval = setInterval(() => {
        try {
            res.write(': keep-alive\n\n');
        } catch (error) {
            console.error('Error en keep-alive:', error);
            clearInterval(keepAliveInterval);
        }
    }, 30000);

    // Limpiar al cerrar la conexión
    req.on('close', () => {
        console.log(`📢 Cliente desconectado: Usuario ${userId}`);
        clearInterval(keepAliveInterval);
        NotificationManager.removeClient(userId, res);
    });

    // Manejar errores del response
    res.on('error', (error) => {
        console.error(`❌ Error en SSE para usuario ${userId}:`, error);
        clearInterval(keepAliveInterval);
        NotificationManager.removeClient(userId, res);
    });

    // NO llamar a res.end() ni next() - la conexión debe mantenerse abierta
};

/**
 * Obtener estadísticas de notificaciones (solo admins)
 */
const getNotificationStats = (req, res) => {
    try {
        const stats = NotificationManager.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

module.exports = {
    streamNotifications,
    getNotificationStats
};
