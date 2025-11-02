import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

function Perfil() {
  const { usuario, actualizarUsuario } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    password_actual: '',
    password_nueva: '',
    password_confirmacion: ''
  });

  useEffect(() => {
    if (usuario) {
      setFormData({
        nombre: usuario.nombre || '',
        email: usuario.email || '',
        telefono: usuario.telefono || '',
        password_actual: '',
        password_nueva: '',
        password_confirmacion: ''
      });
    }
  }, [usuario]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const actualizarPerfil = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const dataToUpdate = {
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono
      };

      const response = await api.put('/usuarios/perfil', dataToUpdate);
      
      if (response.data.success) {
        actualizarUsuario(response.data.usuario);
        setMensaje({ tipo: 'success', texto: '✅ Perfil actualizado correctamente' });
      }
    } catch (error) {
      setMensaje({ 
        tipo: 'error', 
        texto: '❌ ' + (error.response?.data?.error || 'Error al actualizar perfil')
      });
    } finally {
      setLoading(false);
    }
  };

  const cambiarPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    // Validaciones
    if (!formData.password_actual) {
      setMensaje({ tipo: 'error', texto: '❌ Debes ingresar tu contraseña actual' });
      setLoading(false);
      return;
    }

    if (formData.password_nueva.length < 6) {
      setMensaje({ tipo: 'error', texto: '❌ La nueva contraseña debe tener al menos 6 caracteres' });
      setLoading(false);
      return;
    }

    if (formData.password_nueva !== formData.password_confirmacion) {
      setMensaje({ tipo: 'error', texto: '❌ Las contraseñas no coinciden' });
      setLoading(false);
      return;
    }

    try {
      const response = await api.put('/usuarios/cambiar-password', {
        password_actual: formData.password_actual,
        password_nueva: formData.password_nueva
      });
      
      if (response.data.success) {
        setMensaje({ tipo: 'success', texto: '✅ Contraseña actualizada correctamente' });
        setFormData({
          ...formData,
          password_actual: '',
          password_nueva: '',
          password_confirmacion: ''
        });
      }
    } catch (error) {
      setMensaje({ 
        tipo: 'error', 
        texto: '❌ ' + (error.response?.data?.error || 'Error al cambiar contraseña')
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="perfil-header">
          <h1>⚙️ Configuración de Perfil</h1>
          <p className="perfil-subtitle">Administra tu información personal y seguridad</p>
        </div>

        {mensaje.texto && (
          <div className={`alert alert-${mensaje.tipo}`}>
            {mensaje.texto}
          </div>
        )}

        {/* Información del Perfil */}
        <div className="card perfil-card">
          <div className="card-header">
            <h3>👤 Información Personal</h3>
          </div>
          <form onSubmit={actualizarPerfil} className="perfil-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nombre">
                  <span className="label-icon">👤</span>
                  Nombre Completo
                </label>
                <input
                  id="nombre"
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Tu nombre completo"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">
                  <span className="label-icon">✉️</span>
                  Correo Electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="tu@email.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="telefono">
                  <span className="label-icon">📱</span>
                  Teléfono
                </label>
                <input
                  id="telefono"
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="+56912345678"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-save"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Guardando...
                </>
              ) : (
                <>
                  💾 Guardar Cambios
                </>
              )}
            </button>
          </form>
        </div>

        {/* Cambiar Contraseña */}
        <div className="card perfil-card">
          <div className="card-header">
            <h3>🔒 Seguridad</h3>
            <p className="card-subtitle">Actualiza tu contraseña regularmente para mayor seguridad</p>
          </div>
          <form onSubmit={cambiarPassword} className="perfil-form">
            <div className="form-group">
              <label htmlFor="password_actual">
                <span className="label-icon">🔐</span>
                Contraseña Actual
              </label>
              <input
                id="password_actual"
                type="password"
                name="password_actual"
                value={formData.password_actual}
                onChange={handleChange}
                className="form-input"
                placeholder="Ingresa tu contraseña actual"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password_nueva">
                  <span className="label-icon">🔑</span>
                  Nueva Contraseña
                </label>
                <input
                  id="password_nueva"
                  type="password"
                  name="password_nueva"
                  value={formData.password_nueva}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Mínimo 6 caracteres"
                />
                <small className="form-hint">Debe tener al menos 6 caracteres</small>
              </div>

              <div className="form-group">
                <label htmlFor="password_confirmacion">
                  <span className="label-icon">✔️</span>
                  Confirmar Contraseña
                </label>
                <input
                  id="password_confirmacion"
                  type="password"
                  name="password_confirmacion"
                  value={formData.password_confirmacion}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Repite la nueva contraseña"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-success btn-save"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Cambiando...
                </>
              ) : (
                <>
                  🔑 Cambiar Contraseña
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default Perfil;
