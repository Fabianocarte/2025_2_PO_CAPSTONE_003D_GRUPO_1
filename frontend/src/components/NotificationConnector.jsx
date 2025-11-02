import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

/**
 * Componente que conecta automáticamente las notificaciones cuando el usuario está autenticado
 */
function NotificationConnector() {
  const { isAuthenticated, loading } = useAuth();
  const { connectSSE, disconnect } = useNotifications();

  useEffect(() => {
    // No hacer nada si aún está cargando
    if (loading) {
      return;
    }

    if (isAuthenticated) {
      const token = localStorage.getItem('token');
      if (token) {
        console.log('✅ Usuario autenticado con token, conectando SSE...');
        connectSSE();
      } else {
        console.log('⚠️ Usuario autenticado pero sin token');
      }
    } else {
      console.log('❌ Usuario no autenticado, desconectando SSE...');
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, loading]);

  return null; // Este componente no renderiza nada
}

export default NotificationConnector;
