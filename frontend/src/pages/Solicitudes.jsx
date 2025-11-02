import { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

// URL base para imágenes (mismo servidor que el API pero sin /api)
const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function Solicitudes() {
  const { usuario } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [imagenAmpliada, setImagenAmpliada] = useState(null);
  const [mostrarModalRechazo, setMostrarModalRechazo] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false);
  const [datosEdicion, setDatosEdicion] = useState({
    tipo: '',
    prioridad: '',
    descripcion: '',
    vehiculo_id: null,
    notas_supervisor: ''
  });
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const cargarSolicitudes = async () => {
    try {
      const response = await api.get('/solicitudes');
      setSolicitudes(response.data.solicitudes);
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirDetalle = (solicitud) => {
    setSolicitudSeleccionada(solicitud);
  };

  const cerrarDetalle = () => {
    setSolicitudSeleccionada(null);
    setImagenAmpliada(null);
  };

  const ampliarImagen = (imagenUrl) => {
    setImagenAmpliada(imagenUrl);
  };

  const cerrarImagenAmpliada = () => {
    setImagenAmpliada(null);
  };

  // ============================================
  // APROBAR SOLICITUD (crea OT automáticamente)
  // ============================================
  const aprobarSolicitud = async () => {
    if (!window.confirm('¿Aprobar esta solicitud? Se creará automáticamente una Orden de Trabajo.')) {
      return;
    }

    setProcesando(true);
    try {
      const response = await api.put(`/solicitudes/${solicitudSeleccionada.id}/aprobar`, {
        notas_supervisor: 'Aprobado desde el dashboard'
      });

      alert(`✅ ${response.data.message}\n🔧 Orden de Trabajo #${response.data.orden_trabajo.id} creada`);
      
      cerrarDetalle();
      cargarSolicitudes();
    } catch (error) {
      console.error('Error aprobando solicitud:', error);
      alert('❌ Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcesando(false);
    }
  };

  // ============================================
  // RECHAZAR SOLICITUD (permite edición posterior)
  // ============================================
  const abrirModalRechazo = () => {
    setMotivoRechazo('');
    setMostrarModalRechazo(true);
  };

  const confirmarRechazo = async () => {
    if (!motivoRechazo.trim()) {
      alert('⚠️ Debes indicar el motivo del rechazo');
      return;
    }

    setProcesando(true);
    try {
      const response = await api.put(`/solicitudes/${solicitudSeleccionada.id}/rechazar`, {
        motivo_rechazo: motivoRechazo
      });

      alert(`✅ ${response.data.message}`);
      
      setMostrarModalRechazo(false);
      cerrarDetalle();
      cargarSolicitudes();
    } catch (error) {
      console.error('Error rechazando solicitud:', error);
      alert('❌ Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcesando(false);
    }
  };

  // ============================================
  // EDITAR SOLICITUD RECHAZADA
  // ============================================
  const abrirModalEdicion = () => {
    setDatosEdicion({
      tipo: solicitudSeleccionada.tipo || '',
      prioridad: solicitudSeleccionada.prioridad || 'media',
      descripcion: solicitudSeleccionada.descripcion || '',
      vehiculo_id: solicitudSeleccionada.vehiculo_id || null,
      notas_supervisor: ''
    });
    setMostrarModalEdicion(true);
  };

  const guardarEdicion = async () => {
    if (!datosEdicion.tipo || !datosEdicion.prioridad || !datosEdicion.descripcion) {
      alert('⚠️ Completa todos los campos requeridos');
      return;
    }

    setProcesando(true);
    try {
      const response = await api.put(`/solicitudes/${solicitudSeleccionada.id}/editar`, datosEdicion);

      alert(`✅ ${response.data.message}`);
      
      setMostrarModalEdicion(false);
      cerrarDetalle();
      cargarSolicitudes();
    } catch (error) {
      console.error('Error editando solicitud:', error);
      alert('❌ Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcesando(false);
    }
  };

  const eliminarSolicitud = async (solicitudId, e) => {
    e.stopPropagation(); // Evitar que se abra el detalle
    
    if (!window.confirm('⚠️ TESTING: ¿Eliminar esta solicitud y su OT asociada? Esto también reseteará la conversación.')) {
      return;
    }

    try {
      // Primero buscar si tiene una OT asociada
      const responseOrdenes = await api.get('/ordenes');
      const ordenAsociada = responseOrdenes.data.ordenes.find(
        ot => ot.solicitud_id === solicitudId
      );

      if (ordenAsociada) {
        // Si tiene OT, eliminar la OT (esto también eliminará la solicitud)
        await api.delete(`/ordenes/${ordenAsociada.id}`);
        alert('✅ Orden de trabajo, solicitud y conversación eliminadas correctamente');
      } else {
        // Si no tiene OT, solo eliminar la solicitud
        await api.delete(`/solicitudes/${solicitudId}`);
        alert('✅ Solicitud eliminada correctamente');
      }

      // Recargar la lista
      cargarSolicitudes();
    } catch (error) {
      console.error('Error eliminando solicitud:', error);
      alert('❌ Error al eliminar: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) return <div className="spinner"></div>;

  return (
    <>
      <Navbar />
      <div className="container">
      <h1>Solicitudes de Mantenimiento</h1>
      
      {solicitudes.length === 0 ? (
        <div className="card">
          <p>No hay solicitudes registradas aún.</p>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th style={{ width: '100px' }}>Fecha</th>
                <th style={{ width: '100px' }}>Vehículo</th>
                <th style={{ minWidth: '300px' }}>Descripción</th>
                <th style={{ width: '100px' }}>Prioridad</th>
                <th style={{ width: '120px' }}>Estado</th>
                <th style={{ width: '80px' }}>📸</th>
                <th style={{ width: '180px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map(sol => (
                <tr key={sol.id}>
                  <td><strong>#{sol.id}</strong></td>
                  <td>{new Date(sol.fecha_hora).toLocaleDateString()}</td>
                  <td><strong>{sol.vehiculo?.patente || 'N/A'}</strong></td>
                  <td style={{ 
                    whiteSpace: 'normal', 
                    wordWrap: 'break-word',
                    padding: '12px',
                    lineHeight: '1.5'
                  }}>
                    {sol.descripcion.substring(0, 100)}
                    {sol.descripcion.length > 100 && '...'}
                  </td>
                  <td>
                    <span className={`badge badge-${sol.prioridad}`}>
                      {sol.prioridad}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${sol.estado}`}>
                      {sol.estado}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {sol.imagenes && sol.imagenes.length > 0 ? (
                      <span className="badge" style={{ 
                        backgroundColor: '#28a745', 
                        color: 'white',
                        fontSize: '12px'
                      }}>
                        {sol.imagenes.length}
                      </span>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        className="btn-small"
                        onClick={() => abrirDetalle(sol)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '14px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        👁️ Ver
                      </button>
                      <button 
                        className="btn-small"
                        onClick={(e) => eliminarSolicitud(sol.id, e)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '14px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        title="Eliminar solicitud y OT asociada (TESTING)"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: Detalle de Solicitud */}
      {solicitudSeleccionada && (
        <div className="modal-overlay" onClick={cerrarDetalle}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <button className="modal-close" onClick={cerrarDetalle}>×</button>
            
            <h2>Solicitud #{solicitudSeleccionada.id}</h2>
            
            {/* Información General */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3>📋 Información General</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <strong>Fecha:</strong> {new Date(solicitudSeleccionada.fecha_hora).toLocaleString()}
                </div>
                <div>
                  <strong>Estado:</strong>{' '}
                  <span className={`badge badge-${solicitudSeleccionada.estado}`}>
                    {solicitudSeleccionada.estado}
                  </span>
                </div>
                <div>
                  <strong>Prioridad:</strong>{' '}
                  <span className={`badge badge-${solicitudSeleccionada.prioridad}`}>
                    {solicitudSeleccionada.prioridad}
                  </span>
                </div>
                <div>
                  <strong>Tipo:</strong> {solicitudSeleccionada.tipo || 'N/A'}
                </div>
                <div>
                  <strong>Vehículo:</strong> {solicitudSeleccionada.vehiculo?.patente || 'N/A'}
                </div>
                <div>
                  <strong>Chofer:</strong> {solicitudSeleccionada.chofer?.nombre || 'N/A'}
                </div>
                <div>
                  <strong>Teléfono:</strong> {solicitudSeleccionada.telefono_origen || 'N/A'}
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3>📝 Descripción del Problema</h3>
              <p style={{ 
                whiteSpace: 'pre-wrap', 
                lineHeight: '1.6',
                backgroundColor: '#f8f9fa',
                padding: '15px',
                borderRadius: '4px',
                border: '1px solid #dee2e6'
              }}>
                {solicitudSeleccionada.descripcion}
              </p>
            </div>

            {/* Clasificación IA */}
            {solicitudSeleccionada.clasificacion_ia && (
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3>🤖 Clasificación Automática (IA)</h3>
                <div style={{ backgroundColor: '#e7f3ff', padding: '15px', borderRadius: '4px' }}>
                  <p><strong>Resumen:</strong> {solicitudSeleccionada.clasificacion_ia.resumen}</p>
                  <p><strong>Tipo:</strong> {solicitudSeleccionada.clasificacion_ia.tipo}</p>
                  <p><strong>Prioridad sugerida:</strong> {solicitudSeleccionada.clasificacion_ia.prioridad}</p>
                </div>
              </div>
            )}

            {/* Evidencias Fotográficas */}
            {solicitudSeleccionada.imagenes && solicitudSeleccionada.imagenes.length > 0 && (
              <div className="card">
                <h3>📸 Evidencias Fotográficas ({solicitudSeleccionada.imagenes.length})</h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '15px',
                  marginTop: '15px'
                }}>
                  {solicitudSeleccionada.imagenes.map((imagen, index) => {
                    // Determinar si es URL completa (Twilio) o ruta local
                    const esUrlCompleta = imagen.startsWith('http');
                    const urlImagen = esUrlCompleta ? imagen : `${BASE_URL}${imagen}`;
                    
                    // Debug: mostrar URLs en consola
                    console.log(`Imagen ${index + 1}:`, { 
                      original: imagen, 
                      urlFinal: urlImagen, 
                      BASE_URL 
                    });
                    
                    return (
                    <div 
                      key={index}
                      style={{
                        border: '2px solid #dee2e6',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        backgroundColor: '#f8f9fa'
                      }}
                      onClick={() => ampliarImagen(imagen)}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <img 
                        src={urlImagen}
                        alt={`Evidencia ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = `
                            <div style="height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f0f0f0; padding: 20px; text-align: center;">
                              <span style="font-size: 32px; margin-bottom: 10px;">📷</span>
                              <span style="color: #999; font-size: 12px;">Error cargando imagen</span>
                              <span style="color: #666; font-size: 10px; margin-top: 5px; word-break: break-all;">${imagen.substring(0, 60)}...</span>
                              ${esUrlCompleta ? '<span style="color: #dc3545; font-size: 10px; margin-top: 5px;">⚠️ URL de Twilio (puede haber expirado)</span>' : ''}
                            </div>
                          `;
                        }}
                      />
                      <div style={{ 
                        padding: '8px', 
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#666'
                      }}>
                        Evidencia {index + 1}
                      </div>
                    </div>
                    );
                  })}
                </div>
                <p style={{ 
                  marginTop: '15px', 
                  fontSize: '14px', 
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  💡 Click en una imagen para verla en tamaño completo
                </p>
              </div>
            )}

            {/* Sin evidencias */}
            {(!solicitudSeleccionada.imagenes || solicitudSeleccionada.imagenes.length === 0) && (
              <div className="card" style={{ textAlign: 'center', color: '#999' }}>
                <p>📷 No se adjuntaron evidencias fotográficas</p>
              </div>
            )}

            {/* BOTONES DE ACCIÓN - Solo para supervisores y admins */}
            {(usuario?.rol === 'supervisor' || usuario?.rol === 'admin') && (
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                
                {/* SOLICITUD PENDIENTE - Aprobar o Rechazar */}
                {solicitudSeleccionada.estado === 'pendiente' && (
                  <>
                    <button 
                      className="btn btn-aprobar"
                      onClick={aprobarSolicitud}
                      disabled={procesando}
                      style={{ 
                        flex: 1,
                        backgroundColor: '#28a745',
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    >
                      {procesando ? '⏳ Procesando...' : '✅ Aprobar (crea OT)'}
                    </button>
                    <button 
                      className="btn btn-rechazar"
                      onClick={abrirModalRechazo}
                      disabled={procesando}
                      style={{ 
                        flex: 1,
                        backgroundColor: '#dc3545',
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    >
                      ❌ Rechazar (para editar)
                    </button>
                  </>
                )}

                {/* SOLICITUD RECHAZADA - Editar o Re-aprobar */}
                {solicitudSeleccionada.estado === 'rechazada' && (
                  <>
                    <button 
                      className="btn btn-editar"
                      onClick={abrirModalEdicion}
                      disabled={procesando}
                      style={{ 
                        flex: 1,
                        backgroundColor: '#ffc107',
                        color: '#000',
                        fontWeight: 'bold'
                      }}
                    >
                      ✏️ Editar Clasificación
                    </button>
                    <button 
                      className="btn btn-aprobar"
                      onClick={aprobarSolicitud}
                      disabled={procesando}
                      style={{ 
                        flex: 1,
                        backgroundColor: '#28a745',
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    >
                      {procesando ? '⏳ Procesando...' : '✅ Re-aprobar (crea OT)'}
                    </button>
                  </>
                )}

                {/* SOLICITUD APROBADA - Ver OT */}
                {solicitudSeleccionada.estado === 'aprobada' && solicitudSeleccionada.orden_trabajo && (
                  <button 
                    className="btn"
                    onClick={() => window.location.href = '/ordenes'}
                    style={{ 
                      flex: 1,
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    🔧 Ver Orden de Trabajo #{solicitudSeleccionada.orden_trabajo.id}
                  </button>
                )}
              </div>
            )}

            {/* Botón Cerrar */}
            <button 
              className="btn"
              onClick={cerrarDetalle}
              style={{ 
                marginTop: '15px', 
                width: '100%',
                backgroundColor: '#6c757d'
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Imagen Ampliada */}
      {imagenAmpliada && (
        <div 
          className="modal-overlay" 
          onClick={cerrarImagenAmpliada}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
        >
          <button 
            className="modal-close" 
            onClick={cerrarImagenAmpliada}
            style={{ 
              position: 'fixed', 
              top: '20px', 
              right: '20px',
              zIndex: 1001,
              fontSize: '40px',
              color: 'white',
              background: 'rgba(0, 0, 0, 0.5)',
              border: 'none',
              borderRadius: '50%',
              width: '60px',
              height: '60px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
          <img 
            src={imagenAmpliada.startsWith('http') ? imagenAmpliada : `${BASE_URL}${imagenAmpliada}`}
            alt="Imagen ampliada"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 0 30px rgba(0, 0, 0, 0.5)'
            }}
          />
        </div>
      )}

      {/* MODAL: Rechazar Solicitud */}
      {mostrarModalRechazo && (
        <div className="modal-overlay" onClick={() => setMostrarModalRechazo(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <button className="modal-close" onClick={() => setMostrarModalRechazo(false)}>×</button>
            
            <h2>❌ Rechazar Solicitud</h2>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              La solicitud será marcada como rechazada para que puedas editarla y corregir la clasificación de la IA.
            </p>

            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
              Motivo del rechazo *
            </label>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Ejemplo: La IA clasificó como 'falla_eléctrica' pero es un problema de neumáticos"
              rows="4"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginBottom: '20px',
                fontSize: '14px'
              }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn"
                onClick={() => setMostrarModalRechazo(false)}
                style={{ flex: 1, backgroundColor: '#6c757d' }}
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                className="btn"
                onClick={confirmarRechazo}
                style={{ flex: 1, backgroundColor: '#dc3545', color: 'white', fontWeight: 'bold' }}
                disabled={procesando || !motivoRechazo.trim()}
              >
                {procesando ? '⏳ Procesando...' : 'Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Editar Solicitud Rechazada */}
      {mostrarModalEdicion && (
        <div className="modal-overlay" onClick={() => setMostrarModalEdicion(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <button className="modal-close" onClick={() => setMostrarModalEdicion(false)}>×</button>
            
            <h2>✏️ Editar Clasificación de la Solicitud</h2>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              Corrige los datos que la IA clasificó incorrectamente.
            </p>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tipo de Problema *</label>
              <select
                value={datosEdicion.tipo}
                onChange={(e) => setDatosEdicion({ ...datosEdicion, tipo: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">Selecciona tipo...</option>
                <option value="mantenimiento_preventivo">Mantenimiento Preventivo</option>
                <option value="reparacion_urgente">Reparación Urgente</option>
                <option value="revision_rutinaria">Revisión Rutinaria</option>
                <option value="falla_mecanica">Falla Mecánica</option>
                <option value="falla_electrica">Falla Eléctrica</option>
                <option value="accidente">Accidente</option>
                <option value="neumaticos">Neumáticos</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Prioridad *</label>
              <select
                value={datosEdicion.prioridad}
                onChange={(e) => setDatosEdicion({ ...datosEdicion, prioridad: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Descripción *</label>
              <textarea
                value={datosEdicion.descripcion}
                onChange={(e) => setDatosEdicion({ ...datosEdicion, descripcion: e.target.value })}
                rows="4"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Notas del Supervisor</label>
              <textarea
                value={datosEdicion.notas_supervisor}
                onChange={(e) => setDatosEdicion({ ...datosEdicion, notas_supervisor: e.target.value })}
                placeholder="Notas adicionales sobre la corrección..."
                rows="3"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn"
                onClick={() => setMostrarModalEdicion(false)}
                style={{ flex: 1, backgroundColor: '#6c757d' }}
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                className="btn"
                onClick={guardarEdicion}
                style={{ flex: 1, backgroundColor: '#28a745', color: 'white', fontWeight: 'bold' }}
                disabled={procesando || !datosEdicion.tipo || !datosEdicion.prioridad || !datosEdicion.descripcion}
              >
                {procesando ? '⏳ Guardando...' : '💾 Guardar y Listo para Aprobar'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

export default Solicitudes;
