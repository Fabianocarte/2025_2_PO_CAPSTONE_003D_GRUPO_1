import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Solicitudes from './pages/Solicitudes';
import Ordenes from './pages/Ordenes';
import Vehiculos from './pages/Vehiculos';
import Perfil from './pages/Perfil';
import CalendarioSemanal from './pages/CalendarioSemanal';
import NotificationToast from './components/NotificationToast';
import NotificationConnector from './components/NotificationConnector';

// Componente para proteger rutas
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="spinner"></div>;
  }
  
  return isAuthenticated ? (
    <>
      {children}
      <NotificationConnector />
    </>
  ) : (
    <Navigate to="/login" />
  );
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/solicitudes" 
            element={
              <PrivateRoute>
                <Solicitudes />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/ordenes" 
            element={
              <PrivateRoute>
                <Ordenes />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/vehiculos" 
            element={
              <PrivateRoute>
                <Vehiculos />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/perfil" 
            element={
              <PrivateRoute>
                <Perfil />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/calendario" 
            element={
              <PrivateRoute>
                <CalendarioSemanal />
              </PrivateRoute>
            } 
          />
        </Routes>
        
          {/* Sistema de notificaciones en tiempo real */}
          <NotificationToast />
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
