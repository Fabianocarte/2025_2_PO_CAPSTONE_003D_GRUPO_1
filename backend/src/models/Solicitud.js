const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Solicitud = sequelize.define('Solicitud', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    chofer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    },
    vehiculo_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'vehiculos',
            key: 'id'
        }
    },
    fecha_hora: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    tipo: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    prioridad: {
        type: DataTypes.ENUM('baja', 'media', 'alta', 'urgente'),
        defaultValue: 'media'
    },
    estado: {
        type: DataTypes.ENUM('pendiente', 'aprobada', 'rechazada', 'en_proceso', 'completada', 'cancelada'),
        defaultValue: 'pendiente'
    },
    imagenes: {
        type: DataTypes.JSON,
        allowNull: true
    },
    mensaje_original: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    telefono_origen: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    clasificacion_ia: {
        type: DataTypes.JSON,
        allowNull: true
    },
    notas_supervisor: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'solicitudes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Solicitud;
