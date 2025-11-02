import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import './NotificationBell.css';

function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isConnected } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    
    // Navegar a la solicitud si tiene ID
    if (notif.data?.solicitudId) {
      window.location.href = `/solicitudes?id=${notif.data.solicitudId}`;
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button 
        className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''} ${!isConnected ? 'disconnected' : ''}`}
        onClick={toggleDropdown}
        title={isConnected ? 'Notificaciones' : 'Desconectado'}
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
        {!isConnected && <span className="connection-dot offline"></span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Notificaciones</h3>
            {unreadCount > 0 && (
              <span className="unread-count">{unreadCount} nueva{unreadCount > 1 ? 's' : ''}</span>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <span className="empty-icon">🔕</span>
                <p>No hay notificaciones</p>
              </div>
            ) : (
              notifications.slice(0, 10).map(notif => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.read ? 'read' : 'unread'} ${notif.urgent ? 'urgent' : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="notification-item-icon">
                    {notif.tipo === 'solicitud_urgente' ? '🚨' : '📢'}
                  </div>
                  <div className="notification-item-content">
                    <strong className="notification-item-title">{notif.titulo}</strong>
                    <p className="notification-item-message">{notif.mensaje}</p>
                    <div className="notification-item-footer">
                      {notif.data?.prioridad && (
                        <span className={`mini-badge badge-${notif.data.prioridad}`}>
                          {notif.data.prioridad}
                        </span>
                      )}
                      {notif.data?.imagenes > 0 && (
                        <span className="mini-info">📸 {notif.data.imagenes}</span>
                      )}
                      <span className="notification-time">
                        {formatTime(notif.timestamp)}
                      </span>
                    </div>
                  </div>
                  {!notif.read && <span className="unread-dot"></span>}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-dropdown-footer">
              <button
                className="btn-link"
                onClick={() => {
                  markAllAsRead();
                  setIsOpen(false);
                }}
              >
                Marcar todas como leídas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Formatear tiempo relativo
function formatTime(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins}m`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return time.toLocaleDateString();
}

export default NotificationBell;
