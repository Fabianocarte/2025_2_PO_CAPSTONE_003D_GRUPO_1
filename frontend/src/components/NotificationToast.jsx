import { useNotifications } from '../context/NotificationContext';
import './NotificationToast.css';

function NotificationToast() {
  const { notifications, markAsRead } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map(notif => (
        <div
          key={notif.id}
          className={`notification-toast ${notif.urgent ? 'urgent' : ''} ${
            notif.read ? 'read' : ''
          }`}
          onClick={() => markAsRead(notif.id)}
        >
          <div className="notification-header">
            <span className="notification-icon">
              {notif.tipo === 'solicitud_urgente' ? '🚨' : '📢'}
            </span>
            <strong className="notification-title">{notif.titulo}</strong>
            <button
              className="notification-close"
              onClick={(e) => {
                e.stopPropagation();
                markAsRead(notif.id);
              }}
            >
              ×
            </button>
          </div>
          <p className="notification-message">{notif.mensaje}</p>
          {notif.data && (
            <div className="notification-details">
              {notif.data.prioridad && (
                <span className={`badge badge-${notif.data.prioridad}`}>
                  {notif.data.prioridad}
                </span>
              )}
              {notif.data.imagenes > 0 && (
                <span className="notification-images">
                  📸 {notif.data.imagenes} imagen{notif.data.imagenes > 1 ? 'es' : ''}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default NotificationToast;
