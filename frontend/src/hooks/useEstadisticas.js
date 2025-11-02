import { useState, useEffect } from 'react';
import { obtenerEstadisticas } from '../services/api';

export const useEstadisticas = (refreshInterval = 30000) => {
    const [estadisticas, setEstadisticas] = useState({
        solicitudes_pendientes: 0,
        ot_en_proceso: 0,
        ot_completadas: 0,
        total_solicitudes: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchEstadisticas = async () => {
        try {
            setLoading(true);
            const data = await obtenerEstadisticas();
            if (data.success) {
                setEstadisticas(data.data);
            }
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error('Error al cargar estadísticas:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEstadisticas();
        
        // Actualizar cada X segundos
        const interval = setInterval(fetchEstadisticas, refreshInterval);
        
        return () => clearInterval(interval);
    }, [refreshInterval]);

    return { estadisticas, loading, error, refresh: fetchEstadisticas };
};
