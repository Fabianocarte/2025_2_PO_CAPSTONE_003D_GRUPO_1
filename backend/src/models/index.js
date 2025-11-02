// Importar modelos
const Usuario = require('./Usuario');
const Vehiculo = require('./Vehiculo');
const Solicitud = require('./Solicitud');
const OrdenTrabajo = require('./OrdenTrabajo');
const Conversacion = require('./Conversacion');
const HistorialMensaje = require('./HistorialMensaje');

// ============================================
// DEFINIR RELACIONES
// ============================================

// Solicitud - Usuario (Chofer)
Solicitud.belongsTo(Usuario, {
    foreignKey: 'chofer_id',
    as: 'chofer'
});
Usuario.hasMany(Solicitud, {
    foreignKey: 'chofer_id',
    as: 'solicitudes'
});

// Solicitud - Vehiculo
Solicitud.belongsTo(Vehiculo, {
    foreignKey: 'vehiculo_id',
    as: 'vehiculo'
});
Vehiculo.hasMany(Solicitud, {
    foreignKey: 'vehiculo_id',
    as: 'solicitudes'
});

// OrdenTrabajo - Solicitud
OrdenTrabajo.belongsTo(Solicitud, {
    foreignKey: 'solicitud_id',
    as: 'solicitud'
});
Solicitud.hasOne(OrdenTrabajo, {
    foreignKey: 'solicitud_id',
    as: 'orden_trabajo'
});

// OrdenTrabajo - Usuario (Mecánico)
OrdenTrabajo.belongsTo(Usuario, {
    foreignKey: 'mecanico_id',
    as: 'mecanico'
});
Usuario.hasMany(OrdenTrabajo, {
    foreignKey: 'mecanico_id',
    as: 'ordenes_mecanico'
});

// OrdenTrabajo - Usuario (Supervisor)
OrdenTrabajo.belongsTo(Usuario, {
    foreignKey: 'supervisor_id',
    as: 'supervisor'
});
Usuario.hasMany(OrdenTrabajo, {
    foreignKey: 'supervisor_id',
    as: 'ordenes_supervisor'
});

// Conversacion - Usuario (Chofer)
Conversacion.belongsTo(Usuario, {
    foreignKey: 'chofer_id',
    as: 'chofer'
});
Usuario.hasMany(Conversacion, {
    foreignKey: 'chofer_id',
    as: 'conversaciones'
});

// Conversacion - Solicitud (Activa)
Conversacion.belongsTo(Solicitud, {
    foreignKey: 'solicitud_activa_id',
    as: 'solicitudActiva'
});

// HistorialMensaje - Conversacion
HistorialMensaje.belongsTo(Conversacion, {
    foreignKey: 'conversacion_id',
    as: 'conversacion'
});
Conversacion.hasMany(HistorialMensaje, {
    foreignKey: 'conversacion_id',
    as: 'mensajes'
});

module.exports = {
    Usuario,
    Vehiculo,
    Solicitud,
    OrdenTrabajo,
    Conversacion,
    HistorialMensaje
};
