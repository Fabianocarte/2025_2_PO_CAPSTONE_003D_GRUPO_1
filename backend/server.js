require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Importar configuración de base de datos
const { sequelize, testConnection } = require('./src/config/database');

// Importar servicios
const ConversationManager = require('./src/services/conversationManager');
const { Conversacion, Solicitud, HistorialMensaje } = require('./src/models');

// Importar rutas
const authRoutes = require('./src/routes/auth.routes');
const solicitudesRoutes = require('./src/routes/solicitudes.routes');
const ordenesRoutes = require('./src/routes/ordenes.routes');
const vehiculosRoutes = require('./src/routes/vehiculos.routes');
const webhookRoutes = require('./src/routes/webhook.routes');
const usuariosRoutes = require('./src/routes/usuarios.routes');
const notificationsRoutes = require('./src/routes/notifications.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const citasRoutes = require('./src/routes/citas.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// TRUST PROXY (necesario para ngrok y otros proxies)
// ============================================
app.set('trust proxy', 1);

// ============================================
// MIDDLEWARES DE SEGURIDAD
// ============================================
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:", "*"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"]
        }
    }
}));
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Demasiadas solicitudes desde esta IP, intente más tarde.'
});
// Aplicar rate limit a todas las rutas API EXCEPTO el stream SSE
app.use((req, res, next) => {
    if (req.path === '/api/notifications/stream') {
        return next();
    }
    return limiter(req, res, next);
});

// ============================================
// MIDDLEWARES GENERALES
// ============================================
// No comprimir SSE: compression interfiere con conexiones de larga duración
app.use((req, res, next) => {
    if (req.path === '/api/notifications/stream') {
        return next();
    }
    return compression()(req, res, next);
});
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos (uploads) con CORS habilitado
app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
}, express.static('uploads'));

// ============================================
// RUTAS
// ============================================
app.get('/', (req, res) => {
    res.json({
        message: '🚛 PepsiCo Fleet Management API',
        version: '1.0.0',
        status: 'online',
        endpoints: {
            auth: '/api/auth',
            solicitudes: '/api/solicitudes',
            ordenes: '/api/ordenes',
            vehiculos: '/api/vehiculos',
            webhook: '/api/webhook',
            usuarios: '/api/usuarios',
            notifications: '/api/notifications',
            dashboard: '/api/dashboard',
            citas: '/api/citas'
        }
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/ordenes', ordenesRoutes);
app.use('/api/vehiculos', vehiculosRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/citas', citasRoutes);

// ============================================
// MANEJO DE ERRORES
// ============================================
// 404 - Ruta no encontrada
app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.path,
        method: req.method
    });
});

// Error handler global
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Error interno del servidor';
    
    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================
// MANTENIMIENTO DE CONVERSACIONES
// ============================================
/**
 * Ejecutar mantenimiento periódico de conversaciones
 * - Cerrar conversaciones inactivas (>24h sin mensajes)
 * - Limpiar flags de OT activa cuando la OT está finalizada
 * - NO BORRA DATOS: Solo actualiza estados para mantener historial completo
 */
const ejecutarMantenimientoConversaciones = async () => {
    try {
        console.log('\n🔧 Ejecutando mantenimiento de conversaciones...');
        
        const resultado = await ConversationManager.actualizarEstadoConversaciones(
            { Conversacion, Solicitud },
            24 // 24 horas de inactividad
        );
        
        // Mostrar estadísticas
        const stats = await ConversationManager.obtenerEstadisticas(
            { Conversacion, HistorialMensaje }
        );
        
        console.log(`📊 Estadísticas de conversaciones:`);
        console.log(`   Total: ${stats.total} | Activas: ${stats.activas} | Con OT: ${stats.conOTActiva} | Cerradas: ${stats.cerradas}`);
        console.log(`   Mensajes totales: ${stats.totalMensajes} | Hoy: ${stats.mensajesHoy}`);
        console.log('');
        
    } catch (error) {
        console.error('❌ Error en mantenimiento de conversaciones:', error);
    }
};

/**
 * Iniciar cron job de limpieza (cada 1 hora)
 */
const iniciarLimpiezaConversaciones = () => {
    // Ejecutar inmediatamente al iniciar
    setTimeout(() => ejecutarMantenimientoConversaciones(), 5000); // 5 segundos después de iniciar
    
    // Ejecutar cada hora
    const HORA_EN_MS = 60 * 60 * 1000;
    setInterval(ejecutarMantenimientoConversaciones, HORA_EN_MS);
    
    console.log('⏰ Mantenimiento de conversaciones programado (cada 1 hora)');
};

// ============================================
// INICIAR SERVIDOR
// ============================================
const startServer = async () => {
    try {
        // Probar conexión a la base de datos
        await testConnection();
        
        // Sincronizar modelos (solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: false });
            console.log('✅ Modelos sincronizados con la base de datos');
        }
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log('\n🚀 ============================================');
            console.log(`   Servidor iniciado en puerto ${PORT}`);
            console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
            console.log(`   URL: http://localhost:${PORT}`);
            console.log('============================================\n');
            
            // Iniciar limpieza de conversaciones (cada hora)
            iniciarLimpiezaConversaciones();
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;
