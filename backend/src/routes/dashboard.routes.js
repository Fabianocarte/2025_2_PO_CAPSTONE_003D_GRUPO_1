const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { verificarToken } = require('../middleware/auth');

// Obtener estadísticas del dashboard
router.get('/stats', verificarToken, async (req, res) => {
    try {
        const { rol, id } = req.usuario;

        let query;
        let replacements = {};

        if (rol === 'administrador') {
            // Para admin: todas las solicitudes
            query = `
                SELECT 
                    COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as solicitudes_pendientes,
                    COUNT(CASE WHEN estado IN ('aprobado', 'en_proceso') THEN 1 END) as ot_en_proceso,
                    COUNT(CASE WHEN estado = 'completado' THEN 1 END) as ot_completadas,
                    COUNT(*) as total_solicitudes
                FROM solicitudes
            `;
        } else if (rol === 'mecanico') {
            // Para mecánico: solo sus OT asignadas desde la tabla ordenes_trabajo
            query = `
                SELECT 
                    COUNT(CASE WHEN estado = 'asignada' THEN 1 END) as ot_pendientes,
                    COUNT(CASE WHEN estado = 'en_proceso' THEN 1 END) as ot_en_proceso,
                    COUNT(CASE WHEN estado = 'completada' THEN 1 END) as ot_completadas,
                    COUNT(*) as total_ot
                FROM ordenes_trabajo
                WHERE mecanico_id = :mecanicoId
            `;
            replacements = { mecanicoId: id };
        } else {
            // Para conductor: sus propias solicitudes
            query = `
                SELECT 
                    COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as solicitudes_pendientes,
                    COUNT(CASE WHEN estado IN ('aprobado', 'en_proceso') THEN 1 END) as solicitudes_en_proceso,
                    COUNT(CASE WHEN estado = 'completado' THEN 1 END) as solicitudes_completadas,
                    COUNT(*) as total_solicitudes
                FROM solicitudes
                WHERE chofer_id = :choferId
            `;
            replacements = { choferId: id };
        }

        const [results] = await sequelize.query(query, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });
        
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
});

module.exports = router;
