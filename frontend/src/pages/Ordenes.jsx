import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

function Ordenes() {
  const { usuario } = useAuth();
  const [todasLasOrdenes, setTodasLasOrdenes] = useState([]);
  const [misOrdenes, setMisOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [tabActiva, setTabActiva] = useState('mis-ordenes'); // 'mis-ordenes' o 'todas'

  useEffect(() => {
    cargarOrdenes();
  }, []);

  const cargarOrdenes = async () => {
    try {
      setLoading(true);
      
      if (usuario.rol === 'mecanico') {
        // Cargar MIS órdenes (con filtro de mecánico)
        const responseMisOrdenes = await api.get(`/ordenes?mecanico_id=${usuario.id}`);
        setMisOrdenes(responseMisOrdenes.data.ordenes);
        
        // Cargar TODAS las órdenes (con parámetro ver_todas=true)
        const responseTodasOrdenes = await api.get('/ordenes?ver_todas=true');
        setTodasLasOrdenes(responseTodasOrdenes.data.ordenes);
      } else {
        // Admin u otros roles ven todas las órdenes
        const response = await api.get('/ordenes?ver_todas=true');
        setTodasLasOrdenes(response.data.ordenes);
      }
    } catch (error) {
      console.error('Error cargando órdenes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Obtener las órdenes según la tab activa
  const getOrdenesFiltradas = () => {
    if (usuario.rol !== 'mecanico') {
      return todasLasOrdenes; // Admin ve todas por defecto
    }
    return tabActiva === 'mis-ordenes' ? misOrdenes : todasLasOrdenes;
  };

  const verDetalle = (orden) => {
    setOrdenSeleccionada(orden);
  };

  const cerrarDetalle = () => {
    setOrdenSeleccionada(null);
  };

  const ordenesFiltradas = getOrdenesFiltradas();

  if (loading) return <div className="spinner"></div>;

  return (
    <>
      <Navbar />
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>Órdenes de Trabajo</h1>
          <button className="btn btn-primary" onClick={cargarOrdenes}>
            🔄 Actualizar
          </button>
        </div>

        {/* Tabs - Solo para mecánicos */}
        {usuario.rol === 'mecanico' && (
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            marginBottom: '20px',
            borderBottom: '2px solid #e0e0e0'
          }}>
            <button
              onClick={() => setTabActiva('mis-ordenes')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: tabActiva === 'mis-ordenes' ? '#0066cc' : 'transparent',
                color: tabActiva === 'mis-ordenes' ? 'white' : '#666',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                transition: 'all 0.3s',
                borderBottom: tabActiva === 'mis-ordenes' ? '3px solid #0066cc' : 'none'
              }}
            >
              📋 Mis Órdenes Asignadas ({misOrdenes.length})
            </button>
            <button
              onClick={() => setTabActiva('todas')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: tabActiva === 'todas' ? '#0066cc' : 'transparent',
                color: tabActiva === 'todas' ? 'white' : '#666',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                transition: 'all 0.3s',
                borderBottom: tabActiva === 'todas' ? '3px solid #0066cc' : 'none'
              }}
            >
              🗂️ Todas las OT ({todasLasOrdenes.length})
            </button>
          </div>
        )}

        {ordenesFiltradas.length === 0 ? (
          <div className="card">
            <p>
              {tabActiva === 'mis-ordenes' 
                ? 'No tienes órdenes de trabajo asignadas aún.' 
                : 'No hay órdenes de trabajo registradas aún.'}
            </p>
          </div>
        ) : (
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Vehículo</th>
                  <th>Mecánico</th>
                  <th>Supervisor</th>
                  <th>Fecha Asignación</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenesFiltradas.map(orden => (
                  <tr 
                    key={orden.id}
                    style={{
                      backgroundColor: 
                        usuario.rol === 'mecanico' && 
                        orden.mecanico_id === usuario.id && 
                        tabActiva === 'todas' 
                          ? '#e3f2fd' 
                          : 'transparent'
                    }}
                  >
                    <td>
                      <strong>OT-{orden.id}</strong>
                      {usuario.rol === 'mecanico' && orden.mecanico_id === usuario.id && tabActiva === 'todas' && (
                        <span style={{ 
                          marginLeft: '8px', 
                          fontSize: '10px', 
                          background: '#0066cc', 
                          color: 'white', 
                          padding: '2px 6px', 
                          borderRadius: '10px' 
                        }}>
                          TU OT
                        </span>
                      )}
                    </td>
                    <td>{orden.solicitud?.vehiculo?.patente || 'N/A'}</td>
                    <td>{orden.mecanico?.nombre || 'Sin asignar'}</td>
                    <td>{orden.supervisor?.nombre || 'N/A'}</td>
                    <td>{new Date(orden.fecha_asignacion).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge badge-${orden.estado}`}>
                        {orden.estado}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => verDetalle(orden)}
                      >
                        👁️ Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Modal de Detalle */}
      {ordenSeleccionada && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2>Orden de Trabajo #{ordenSeleccionada.id}</h2>
              <button 
                onClick={cerrarDetalle}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '24px', 
                  cursor: 'pointer' 
                }}
              >
                ✖️
              </button>
            </div>

            {/* Información del Vehículo */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3>🚛 Información del Vehículo</h3>
              <p><strong>Patente:</strong> {ordenSeleccionada.solicitud?.vehiculo?.patente || 'N/A'}</p>
              <p><strong>Marca:</strong> {ordenSeleccionada.solicitud?.vehiculo?.marca || 'N/A'}</p>
              <p><strong>Modelo:</strong> {ordenSeleccionada.solicitud?.vehiculo?.modelo || 'N/A'}</p>
              <p><strong>Kilometraje:</strong> {ordenSeleccionada.solicitud?.vehiculo?.kilometraje || 'N/A'} km</p>
            </div>

            {/* Información de la Solicitud Original */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3>📋 Solicitud Original</h3>
              <p><strong>Chofer:</strong> {ordenSeleccionada.solicitud?.chofer?.nombre || 'N/A'}</p>
              <p><strong>Descripción:</strong> {ordenSeleccionada.solicitud?.descripcion}</p>
              <p><strong>Tipo:</strong> {ordenSeleccionada.solicitud?.tipo}</p>
              <p>
                <strong>Prioridad:</strong> 
                <span className={`badge badge-${ordenSeleccionada.solicitud?.prioridad}`} style={{ marginLeft: '10px' }}>
                  {ordenSeleccionada.solicitud?.prioridad}
                </span>
              </p>
            </div>

            {/* Estado de la Orden */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3>🔧 Estado de la Orden</h3>
              <p>
                <strong>Estado:</strong> 
                <span className={`badge badge-${ordenSeleccionada.estado}`} style={{ marginLeft: '10px' }}>
                  {ordenSeleccionada.estado}
                </span>
              </p>
              <p><strong>Mecánico Asignado:</strong> {ordenSeleccionada.mecanico?.nombre || 'Sin asignar'}</p>
              <p><strong>Supervisor:</strong> {ordenSeleccionada.supervisor?.nombre || 'N/A'}</p>
              <p><strong>Fecha Asignación:</strong> {new Date(ordenSeleccionada.fecha_asignacion).toLocaleString()}</p>
              {ordenSeleccionada.fecha_inicio && (
                <p><strong>Fecha Inicio:</strong> {new Date(ordenSeleccionada.fecha_inicio).toLocaleString()}</p>
              )}
              {ordenSeleccionada.fecha_fin && (
                <p><strong>Fecha Finalización:</strong> {new Date(ordenSeleccionada.fecha_fin).toLocaleString()}</p>
              )}
            </div>

            {/* Diagnóstico y Trabajo Realizado */}
            {(ordenSeleccionada.diagnostico || ordenSeleccionada.trabajo_realizado) && (
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3>🔍 Diagnóstico y Trabajo</h3>
                {ordenSeleccionada.diagnostico && (
                  <>
                    <h4>Diagnóstico:</h4>
                    <p>{ordenSeleccionada.diagnostico}</p>
                  </>
                )}
                {ordenSeleccionada.trabajo_realizado && (
                  <>
                    <h4>Trabajo Realizado:</h4>
                    <p>{ordenSeleccionada.trabajo_realizado}</p>
                  </>
                )}
              </div>
            )}

            {/* Repuestos */}
            {ordenSeleccionada.repuestos_usados && (
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3>🔩 Repuestos Utilizados</h3>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '10px', 
                  borderRadius: '5px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(ordenSeleccionada.repuestos_usados, null, 2)}
                </pre>
              </div>
            )}

            {/* Costos y Tiempo */}
            <div className="card">
              <h3>💰 Costos y Tiempo</h3>
              <p><strong>Horas de Trabajo:</strong> {ordenSeleccionada.horas_trabajo || 0} hrs</p>
              <p><strong>Costo Total:</strong> ${Number(ordenSeleccionada.costo_total || 0).toLocaleString('es-CL')}</p>
              {ordenSeleccionada.observaciones && (
                <>
                  <h4>Observaciones:</h4>
                  <p>{ordenSeleccionada.observaciones}</p>
                </>
              )}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={cerrarDetalle}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

export default Ordenes;
