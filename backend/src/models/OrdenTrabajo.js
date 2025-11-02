const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OrdenTrabajo = sequelize.define('OrdenTrabajo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    solicitud_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'solicitudes',
            key: 'id'
        }
    },
    mecanico_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    },
    supervisor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    },
    fecha_asignacion: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    fecha_inicio: {
        type: DataTypes.DATE,
        allowNull: true
    },
    fecha_fin: {
        type: DataTypes.DATE,
        allowNull: true
    },
    diagnostico: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    trabajo_realizado: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    repuestos_usados: {
        type: DataTypes.JSON,
        allowNull: true
    },
    costo_total: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    horas_trabajo: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0
    },
    estado: {
        type: DataTypes.ENUM('asignada', 'en_proceso', 'completada', 'pausada', 'cancelada'),
        defaultValue: 'asignada'
    },
    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'ordenes_trabajo',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = OrdenTrabajo;
