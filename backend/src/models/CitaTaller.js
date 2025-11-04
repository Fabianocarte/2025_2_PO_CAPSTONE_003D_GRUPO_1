const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CitaTaller = sequelize.define('CitaTaller', {
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
        },
        onDelete: 'CASCADE'
    },
    mecanico_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    },
    fecha_cita: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    hora_cita: {
        type: DataTypes.TIME,
        allowNull: false
    },
    duracion_estimada: {
        type: DataTypes.INTEGER,
        defaultValue: 30, // 30 minutos por defecto
        comment: 'Duración en minutos'
    },
    estado_cita: {
        type: DataTypes.ENUM('programada', 'confirmada', 'en_proceso', 'completada', 'cancelada'),
        defaultValue: 'programada'
    },
    tipo_agendamiento: {
        type: DataTypes.ENUM('automatico', 'manual'),
        defaultValue: 'automatico'
    },
    notas_agendamiento: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'citas_taller',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['mecanico_id', 'fecha_cita']
        },
        {
            fields: ['solicitud_id']
        },
        {
            fields: ['fecha_cita', 'hora_cita']
        }
    ]
});

module.exports = CitaTaller;