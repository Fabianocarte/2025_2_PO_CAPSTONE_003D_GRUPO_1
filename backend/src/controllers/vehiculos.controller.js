const { Vehiculo, Solicitud } = require('../models');

const listarVehiculos = async (req, res) => {
    try {
        const vehiculos = await Vehiculo.findAll({
            order: [['patente', 'ASC']]
        });

        res.json({
            total: vehiculos.length,
            vehiculos
        });
    } catch (error) {
        console.error('Error listando vehículos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

const obtenerHistorial = async (req, res) => {
    try {
        const { patente } = req.params;

        const vehiculo = await Vehiculo.findOne({
            where: { patente },
            include: [{
                model: Solicitud,
                as: 'solicitudes',
                order: [['fecha_hora', 'DESC']]
            }]
        });

        if (!vehiculo) {
            return res.status(404).json({ error: 'Vehículo no encontrado' });
        }

        res.json(vehiculo);
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

module.exports = {
    listarVehiculos,
    obtenerHistorial
};
