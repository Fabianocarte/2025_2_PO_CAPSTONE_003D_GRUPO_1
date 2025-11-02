import { useEffect, useState, useCallback, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const addNotification = useCallback((notification) => {
    const newNotif = {
      ...notification,
      id: Date.now() + Math.random(),
      read: false,
      timestamp: notification.timestamp || new Date().toISOString()
    };

    setNotifications(prev => [newNotif, ...prev]);

    // Auto-remover después de 10 segundos
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 10000);

    return newNotif;
  }, []);

  const connectSSE = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No hay token, no se puede conectar a notificaciones');
      return;
    }

    // Cerrar conexión anterior si existe
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const url = `${API_URL.replace('/api', '')}/api/notifications/stream`;
      
      // EventSource no soporta headers personalizados, enviamos token como query param
      const urlWithToken = `${url}?token=${token}`;
      const eventSource = new EventSource(urlWithToken);

      eventSource.onopen = () => {
        console.log('✅ Conectado a notificaciones en tiempo real');
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📢 Notificación recibida:', data);

          if (data.tipo !== 'connected') {
            addNotification(data);

            // Reproducir sonido si es urgente
            if (data.urgent || data.tipo === 'solicitud_urgente') {
              playNotificationSound();
            }
          }
        } catch (error) {
          console.error('Error parseando notificación:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ Error en SSE:', error);
        setIsConnected(false);
        eventSource.close();

        // Intentar reconectar después de 5 segundos
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Reconectando...');
          connectSSE();
        }, 5000);
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('Error creando EventSource:', error);
    }
  }, [addNotification, API_URL]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    connectSSE();

    return () => {
      disconnect();
    };
  }, [connectSSE, disconnect]);

  return {
    notifications,
    isConnected,
    addNotification,
    markAsRead,
    clearAll,
    unreadCount: notifications.filter(n => !n.read).length
  };
};

// Función auxiliar para reproducir sonido
function playNotificationSound() {
  try {
    // Usar Audio API del navegador
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYHGGS56+mdTBALTqXh8LdjHAU2jdXwyHUsBC15y/DbjzsIEly06+umUhEKQpzd8sFuJAUme8rx2YU2BxhguOznoU4RCkyi4fC4YhsEOJHX8sx4LAQtecrw2os4BxJctOnspVIRCkKc3fK/biMEJnjJ8dqHNgcXXrXr66VTEgpAmdz0wm8jBSl+zPHVizcHFly06+qnUxEJQJvd8r1tJAUme8rx2YUXBxlguOzoUxkKQpze8sFxIwQpc8zw1ok5Bhdcte3qp1MSCkKa3fO/byQFKIDL8dmHNgcZXrTq66ZTEgpCm93ywHAmBS19yfLaiToIGF+z6+yjVBMKQpjd8sJuJgUsfsvw2Yg4CBdgsurqo1MRCUCa3vPAcCYFLoHK8tiJOQcXXLPp66RSEQhCnN7xwXAkBSh/zPDajzsIFl2z6+uhTRAKQ5zd8sFxJAUsfsrw2oc3BxddsuvqoVMRCUOb3fK/cCQFKoDM8tiJOAgXXbPp66RSEQlDm93wwHAmBSl+zPDajzsIFl2z6+uhTRAKQ5zd8sFxJAUsfsrw2oc3BxddsuvqoVMRCUOb3fK/cCQFKoDM8tiJOAgXXbPp66RSEQlDm93wwHAmBSh/zPDajz0HFl6z6eqhTBAKRJzd8r9wJAUrgcrw2Ik4BxhdsuvsI1QRCkKb3fLAcSYFKn/M8NqJOQcWXrTq66VUEglCnN3ywHAmBS1+yPHajzoIFl606+qjVBEJQpre8r9wJgUrfsrw2ok6BxdcsurqpFMRCUKa3PK/bycEKn/L8NmIOQcXXLPp66RSEQhCnN7xwXAkBSl/zPDajzsIFl2z6+uhTRAKQ5zd8sFxJAUsfsrw2oc3BxddsuvqoVMRCUOb3fK/cCQFKoDM8tiJOAgXXbPp66RSEQlDm93wwHAmBSh/zPDajz0HFl6z6eqhTBAKRJzd8r9wJAUrgcrw2Ik4BxhdsuvsI1QRCkKb3fLAcSYFKn/M8NqJOQcWXrTq66VUEglCnN3ywHAmBS1+yPHajzoIFl606+qjVBEJQpre8r9wJgUrfsrw2ok6BxdcsurqpFMRCUKa3PK/bycEKn/L8NmIOQcXXLPp66RSEQhCnN7xwXAkBSl/zPDajzsIFl2z6+uhTRAKQ5zd8sFxJAUsfsrw2oc3BxddsuvqoVMRCUOb3fK/cCQFKoDM8tiJOAgXXbPp66RSEQlDm93wwHAmBSh/zPDajz0HFl6z6eqhTBAKRJzd8r9wJAUrgcrw2Ik4BxhdsuvsI1QRCkKb3fLAcSYFKn/M8NqJOQcWXrTq66VUEglCnN3ywHAmBS1+yPHajzoIFl606+qjVBEJQpre8r9wJgUrfsrw2ok6BxdcsurqpFMRCUKa3PK/bycEKn/L8NmIOQcXXLPp66RSEQhCnN7xwXAkBSl/zPDajzsIFl2z6+uhTRAKQ5zd8sFxJAUsfsrw2oc3BxddsuvqoVMRCUOb3fK/cCQFKoDM8tiJOAgXXbPp66RSEQlDm93wwHAmBSh/zPDajz0HFl6z6eqhTBAKRJzd8r9wJAUrgcrw2Ik4BxhdsuvsI1QRCkKb3fLAcSYFKn/M8NqJOQcWXrTq66VUEglCnN3ywHAmBS1+yPHajzoIFl606+qjVBEJQpre8r9wJgUrfsrw2ok6BxdcsurqpFMRCUKa3PK/bycEKn/L8NmIOQcXXLPp66RSEg==');
    audio.volume = 0.5;
    audio.play().catch(err => console.warn('No se pudo reproducir sonido:', err));
  } catch (error) {
    console.warn('Error reproduciendo sonido:', error);
  }
}
