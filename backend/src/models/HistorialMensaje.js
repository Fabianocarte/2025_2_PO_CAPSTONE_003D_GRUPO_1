const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HistorialMensaje = sequelize.define('HistorialMensaje', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        conversacion_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        telefono: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        tipo: {
            type: DataTypes.ENUM('entrante', 'saliente'),
            allowNull: false
        },
        mensaje: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        tiene_imagenes: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        numero_imagenes: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        fue_incidencia: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'historial_mensajes',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

module.exports = HistorialMensaje;
