import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications debe usarse dentro de NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const audioRef = useRef(null);

  const playNotificationSound = useCallback(() => {
    try {
      // Usar Web Audio API para crear un sonido de notificación
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configurar el sonido (dos tonos: ding-dong)
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);

      // Segundo tono
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        
        oscillator2.frequency.value = 600;
        oscillator2.type = 'sine';
        
        gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.3);
      }, 200);

    } catch (err) {
      console.log('No se pudo reproducir el sonido:', err);
    }
  }, []);

  const addNotification = useCallback((notification) => {
    const newNotif = {
      ...notification,
      id: Date.now() + Math.random(),
      read: false,
      timestamp: notification.timestamp || new Date().toISOString()
    };

    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      // Mantener solo las últimas 50 notificaciones
      return updated.slice(0, 50);
    });

    setUnreadCount(prev => prev + 1);

    // Reproducir sonido SIEMPRE que llegue una nueva solicitud
    if (notification.tipo === 'nueva_solicitud' || notification.tipo === 'solicitud_urgente') {
      playNotificationSound();
    }

    // Mostrar notificación del navegador para todas las solicitudes
    if (
      (notification.tipo === 'nueva_solicitud' || notification.tipo === 'solicitud_urgente') &&
      'Notification' in window && 
      Notification.permission === 'granted'
    ) {
      const browserNotif = new Notification(notification.titulo, {
        body: notification.mensaje,
        icon: '/pepsico-icon.png',
        badge: '/pepsico-icon.png',
        tag: `notif-${newNotif.id}`,
        requireInteraction: notification.urgent // Solo urgentes requieren interacción
      });

      // Hacer clic en la notificación enfoca la ventana
      browserNotif.onclick = () => {
        window.focus();
        browserNotif.close();
      };
    }

    return newNotif;
  }, [playNotificationSound]);

  const connectSSE = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('⚠️ No hay token, no se puede conectar a notificaciones');
      setIsConnected(false);
      return;
    }

    // Cerrar conexión anterior si existe
    if (eventSourceRef.current) {
      console.log('🔌 Cerrando conexión SSE anterior...');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const baseUrl = API_URL.replace('/api', '');
      const url = `${baseUrl}/api/notifications/stream`;
      const urlWithToken = `${url}?token=${encodeURIComponent(token)}`;
      console.log('� URL con token:', urlWithToken.substring(0, 100) + '...');
      console.log('🔑 Token (primeros 30 chars):', token.substring(0, 30) + '...');
      
      const eventSource = new EventSource(urlWithToken);
      
      console.log('🔗 EventSource creado, readyState:', eventSource.readyState);
      console.log('🔗 EventSource URL:', eventSource.url);

      eventSource.onopen = (event) => {
        console.log('✅ Conectado a notificaciones en tiempo real');
        console.log('✅ Evento onopen:', event);
        console.log('✅ EventSource readyState:', eventSource.readyState);
        setIsConnected(true);
        
        // Limpiar timeout de reconexión
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      eventSource.onmessage = (event) => {
        console.log('📨 EventSource onmessage recibido');
        console.log('📨 Event data:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('📢 Notificación recibida:', data);

          // Ignorar mensaje de conexión inicial
          if (data.tipo === 'connected') {
            console.log('🔗 Confirmación de conexión SSE');
            return;
          }

          addNotification(data);
        } catch (error) {
          console.error('❌ Error parseando notificación:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ Error en SSE:', error);
        console.error('❌ EventSource readyState:', eventSource.readyState);
        console.error('❌ EventSource url:', eventSource.url);

        // ReadyState: 0=CONNECTING, 1=OPEN, 2=CLOSED
        if (eventSource.readyState === 2) {
          console.warn('❌ Conexión SSE cerrada; programando reconexión...');
          setIsConnected(false);
          eventSource.close();
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('🔄 Intentando reconectar...');
              reconnectTimeoutRef.current = null;
              connectSSE();
            }, 3000);
          }
        } else {
          // Estado CONNECTING: no cerrar, esperar
          console.warn('⏳ SSE en estado CONNECTING; esperando...');
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('❌ Error creando EventSource:', error);
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      console.log('🔌 Desconectando SSE');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // NO conectar automáticamente aquí
  // La conexión se manejará desde NotificationConnector
  // solo cuando el usuario esté autenticado

  // Solicitar permiso para notificaciones del navegador
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('📬 Permiso de notificaciones:', permission);
      });
    }
  }, []);

  const value = {
    notifications,
    isConnected,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    connectSSE,
    disconnect
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
