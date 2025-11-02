const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Conversacion = sequelize.define('Conversacion', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        telefono: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true
        },
        chofer_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        estado: {
            type: DataTypes.ENUM('activa', 'esperando_info', 'cerrada'),
            defaultValue: 'activa'
        },
        estado_ingreso: {
            type: DataTypes.ENUM('inicial', 'esperando_patente', 'esperando_kilometraje', 'esperando_problema', 'esperando_fotos', 'confirmacion', 'completado'),
            defaultValue: 'inicial',
            allowNull: true
        },
        datos_ingreso_temp: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Almacena temporalmente: {patente, kilometraje, problema, fotos[]}'
        },
        ultimo_saludo: {
            type: DataTypes.DATE,
            allowNull: true
        },
        resumen_conversacion: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        ultimo_mensaje: {
            type: DataTypes.DATE,
            allowNull: true
        },
        mensajes_sin_incidencia: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        tiene_solicitud_activa: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        solicitud_activa_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'conversaciones',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

module.exports = Conversacion;
