import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

function Navbar() {
  const { usuario, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Definir menús según el rol
  const getMenuItems = () => {
    switch (usuario?.rol) {
      case 'mecanico':
        return (
          <>
            <Link to="/">Dashboard</Link>
            <Link to="/ordenes">Órdenes</Link>
          </>
        );
      case 'conductor':
        return (
          <>
            <Link to="/">Dashboard</Link>
            <Link to="/solicitudes">Mis Solicitudes</Link>
            <Link to="/vehiculos">Vehículos</Link>
          </>
        );
      case 'admin':
      case 'administrador':
      case 'supervisor':
        return (
          <>
            <Link to="/">Dashboard</Link>
            <Link to="/solicitudes">Solicitudes</Link>
            <Link to="/ordenes">Órdenes</Link>
            <Link to="/vehiculos">Vehículos</Link>
            <Link to="/usuarios">Usuarios</Link>
          </>
        );
      default:
        return (
          <>
            <Link to="/">Dashboard</Link>
          </>
        );
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h2>🚛 PepsiCo Fleet Management</h2>
      </div>
      <div className="navbar-menu">
        {getMenuItems()}
      </div>
      <NotificationBell />
      <div className="navbar-user" ref={dropdownRef}>
        <div 
          className="user-profile"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <div className="user-avatar">
            {usuario?.nombre?.charAt(0).toUpperCase()}
          </div>
          <span className="user-name">{usuario?.nombre}</span>
          <span className="dropdown-arrow">▼</span>
        </div>
        
        {dropdownOpen && (
          <div className="user-dropdown">
            <div className="dropdown-header">
              <div className="dropdown-user-info">
                <strong>{usuario?.nombre}</strong>
                <small>{usuario?.email}</small>
                <span className="user-role-badge">{usuario?.rol}</span>
              </div>
            </div>
            <div className="dropdown-divider"></div>
            <Link 
              to="/perfil" 
              className="dropdown-item"
              onClick={() => setDropdownOpen(false)}
            >
              <span className="dropdown-icon">⚙️</span>
              Configurar Perfil
            </Link>
            <div className="dropdown-divider"></div>
            <button 
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }} 
              className="dropdown-item logout"
            >
              <span className="dropdown-icon">🚪</span>
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
