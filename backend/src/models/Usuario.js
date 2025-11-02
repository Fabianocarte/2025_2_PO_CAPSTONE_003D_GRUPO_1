const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const Usuario = sequelize.define('Usuario', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    telefono: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    rol: {
        type: DataTypes.ENUM('chofer', 'supervisor', 'mecanico', 'admin'),
        allowNull: false
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'usuarios',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
        beforeCreate: async (usuario) => {
            if (usuario.password_hash) {
                usuario.password_hash = await bcrypt.hash(usuario.password_hash, 10);
            }
        },
        beforeUpdate: async (usuario) => {
            if (usuario.changed('password_hash')) {
                usuario.password_hash = await bcrypt.hash(usuario.password_hash, 10);
            }
        }
    }
});

// Método de instancia para validar password
Usuario.prototype.validarPassword = async function(password) {
    return await bcrypt.compare(password, this.password_hash);
};

// Método para obtener usuario sin password
Usuario.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password_hash;
    return values;
};

module.exports = Usuario;
