import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import './CalendarioSemanal.css';

function CalendarioSemanal() {
    const { usuario } = useAuth();
    const [calendario, setCalendario] = useState({});
    const [semanaActual, setSemanaActual] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = 'Agendamiento - PepsiCo Fleet Management';
    }, []);

    useEffect(() => {
        cargarVistaSemanal();
    }, [semanaActual]);

    const cargarVistaSemanal = async () => {
        try {
            const params = semanaActual ? `?fecha_inicio=${semanaActual}` : '';
            const response = await api.get(`/citas/vista-semanal${params}`);
            
            setCalendario(response.data.calendario);
            if (!semanaActual) {
                setSemanaActual(response.data.semana);
            }
        } catch (error) {
            console.error('Error cargando vista semanal:', error);
        } finally {
            setLoading(false);
        }
    };

    const cambiarSemana = (direccion) => {
        const fecha = new Date(semanaActual);
        fecha.setDate(fecha.getDate() + (direccion * 7));
        setSemanaActual(fecha.toISOString().split('T')[0]);
    };

    const cambiarEstadoCita = async (citaId, nuevoEstado) => {
        try {
            await api.put(`/citas/${citaId}/estado`, { estado: nuevoEstado });
            cargarVistaSemanal();
        } catch (error) {
            console.error('Error actualizando cita:', error);
            alert('Error al actualizar el estado de la cita');
        }
    };

    const obtenerColorPrioridad = (prioridad) => {
        const colores = {
            'urgente': '#e74c3c',
            'alta': '#f39c12',
            'media': '#3498db',
            'baja': '#95a5a6'
        };
        return colores[prioridad] || '#95a5a6';
    };

    const formatearFecha = (fechaStr) => {
        const fecha = new Date(fechaStr + 'T00:00:00');
        return fecha.toLocaleDateString('es-CL', { 
            day: 'numeric', 
            month: 'short' 
        });
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="container">
                    <div className="spinner">Cargando agendamiento...</div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="container">
                {/* Header con título y navegación de semana */}
                <div className="calendario-header">
                    <h1>📅 Agendamiento de Taller</h1>
                    
                    <div className="navegacion-semana">
                        <button 
                            className="btn btn-secondary"
                            onClick={() => cambiarSemana(-1)}
                        >
                            ← Anterior
                        </button>
                        
                        <span className="semana-actual">
                            Semana del {formatearFecha(semanaActual)}
                        </span>
                        
                        <button 
                            className="btn btn-secondary"
                            onClick={() => cambiarSemana(1)}
                        >
                            Siguiente →
                        </button>
                    </div>
                </div>

                {/* Grid del agendamiento semanal */}
                <div className="calendario-semanal">
                    {Object.values(calendario).map((dia) => (
                        <div key={dia.fecha} className="dia-columna">
                            {/* Header del día */}
                            <div className="dia-header">
                                <h3>{dia.dia}</h3>
                                <span className="fecha">{formatearFecha(dia.fecha)}</span>
                                <span className="contador-citas">
                                    {dia.citas.length} cita{dia.citas.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {/* Lista de citas del día */}
                            <div className="citas-dia">
                                {dia.citas.length === 0 ? (
                                    <div className="sin-citas">
                                        <span>📅</span>
                                        <p>Sin citas</p>
                                    </div>
                                ) : (
                                    dia.citas.map(cita => (
                                        <div 
                                            key={cita.id} 
                                            className={`cita-item estado-${cita.estado_cita}`}
                                            style={{ 
                                                borderLeft: `4px solid ${obtenerColorPrioridad(cita.solicitud?.prioridad)}` 
                                            }}
                                        >
                                            <div className="cita-tiempo">
                                                <strong>{cita.hora_cita}</strong>
                                                <span className="duracion">({cita.duracion_estimada} min)</span>
                                            </div>
                                            
                                            <div className="cita-vehiculo">
                                                🚛 {cita.solicitud?.vehiculo?.patente || 'Sin vehículo'}
                                            </div>
                                            
                                            {/* Mostrar mecánico solo si eres admin/supervisor */}
                                            {(usuario.rol === 'admin' || usuario.rol === 'supervisor') && (
                                                <div className="cita-mecanico">
                                                    🔧 {cita.mecanico?.nombre}
                                                </div>
                                            )}
                                            
                                            <div className="cita-descripcion">
                                                {cita.solicitud?.descripcion?.substring(0, 50)}
                                                {cita.solicitud?.descripcion?.length > 50 ? '...' : ''}
                                            </div>
                                            
                                            <div className="cita-acciones">
                                                <span className={`badge badge-${cita.solicitud?.prioridad}`}>
                                                    {cita.solicitud?.prioridad}
                                                </span>
                                                
                                                {/* Botones de acción según rol y estado */}
                                                {cita.estado_cita === 'programada' && (
                                                    (usuario.rol === 'mecanico' && cita.mecanico_id === usuario.id) ? (
                                                        <button 
                                                            className="btn-mini btn-primary"
                                                            onClick={() => cambiarEstadoCita(cita.id, 'en_proceso')}
                                                        >
                                                            Iniciar
                                                        </button>
                                                    ) : (
                                                        <span className="estado-badge programada">Programada</span>
                                                    )
                                                )}
                                                
                                                {cita.estado_cita === 'en_proceso' && (
                                                    (usuario.rol === 'mecanico' && cita.mecanico_id === usuario.id) ? (
                                                        <button 
                                                            className="btn-mini btn-success"
                                                            onClick={() => cambiarEstadoCita(cita.id, 'completada')}
                                                        >
                                                            Finalizar
                                                        </button>
                                                    ) : (
                                                        <span className="estado-badge en-proceso">En Proceso</span>
                                                    )
                                                )}
                                                
                                                {cita.estado_cita === 'completada' && (
                                                    <span className="estado-badge completada">✅ Completada</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

export default CalendarioSemanal;