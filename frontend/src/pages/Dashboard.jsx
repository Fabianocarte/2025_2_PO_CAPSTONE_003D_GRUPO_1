import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { useEstadisticas } from '../hooks/useEstadisticas';
import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import './Dashboard.css';

function Dashboard() {
  const { usuario } = useAuth();
  const { notifications } = useNotifications();
  const { estadisticas, loading, refresh } = useEstadisticas(5000); // Actualiza cada 5 segundos

  // Actualizar estadísticas cuando llegue una nueva notificación
  useEffect(() => {
    if (notifications.length > 0) {
      refresh();
    }
  }, [notifications.length]);

  const getStatsCards = () => {
    if (usuario.rol === 'administrador') {
      return [
        {
          title: 'Solicitudes Pendientes',
          value: estadisticas.solicitudes_pendientes || 0,
          icon: '📋',
          color: 'warning'
        },
        {
          title: 'OT en Proceso',
          value: estadisticas.ot_en_proceso || 0,
          icon: '🔧',
          color: 'info'
        },
        {
          title: 'OT Completadas',
          value: estadisticas.ot_completadas || 0,
          icon: '✅',
          color: 'success'
        },
        {
          title: 'Total Solicitudes',
          value: estadisticas.total_solicitudes || 0,
          icon: '📊',
          color: 'primary'
        }
      ];
    } else if (usuario.rol === 'mecanico') {
      return [
        {
          title: 'OT Pendientes',
          value: estadisticas.ot_pendientes || 0,
          icon: '📋',
          color: 'warning'
        },
        {
          title: 'OT en Proceso',
          value: estadisticas.ot_en_proceso || 0,
          icon: '🔧',
          color: 'info'
        },
        {
          title: 'OT Completadas',
          value: estadisticas.ot_completadas || 0,
          icon: '✅',
          color: 'success'
        },
        {
          title: 'Total OT',
          value: estadisticas.total_ot || 0,
          icon: '📊',
          color: 'primary'
        }
      ];
    } else {
      return [
        {
          title: 'Solicitudes Pendientes',
          value: estadisticas.solicitudes_pendientes || 0,
          icon: '📋',
          color: 'warning'
        },
        {
          title: 'En Proceso',
          value: estadisticas.solicitudes_en_proceso || 0,
          icon: '🔧',
          color: 'info'
        },
        {
          title: 'Completadas',
          value: estadisticas.solicitudes_completadas || 0,
          icon: '✅',
          color: 'success'
        },
        {
          title: 'Total',
          value: estadisticas.total_solicitudes || 0,
          icon: '📊',
          color: 'primary'
        }
      ];
    }
  };

  return (
    <div className="dashboard">
      <Navbar />

      <div className="container">
        <div className="dashboard-header">
          <h1>Bienvenido, {usuario?.nombre}</h1>
          <p>Panel de control principal</p>
        </div>

        <div className="dashboard-grid">
          {getStatsCards().map((stat, index) => (
            <div key={index} className={`card stat-card stat-${stat.color}`}>
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-content">
                <h3>{stat.title}</h3>
                <p className="stat-number">{loading ? '...' : stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
